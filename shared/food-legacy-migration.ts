import { collection, doc, getDoc, getDocs, runTransaction, type Firestore } from 'firebase/firestore';

export const FOOD_MIGRATION_ID = 'food-legacy-emulator-v1';
export type FoodLegacyCollection = 'menuItems' | 'tables';
export type FoodMigrationStatus = 'CREATE' | 'ALREADY_APPLIED' | 'CONFLICT' | 'DRIFT';
export interface FoodMigrationEntry {
  collection: FoodLegacyCollection;
  id: string;
  path: string;
  status: FoodMigrationStatus;
  checksum: string;
}
type JsonObject = Record<string, unknown>;
type MigrationLedger = { migrationId: string; tenantId: string; sourcePath: string; targetPath: string; checksum: string; createdAt: string };
const ID_PATTERN = /^[a-zA-Z0-9_-]{3,100}$/;
const TENANT_PATTERN = /^[a-z][a-z0-9-]{2,62}$/;

export function assertFoodMigrationEnvironment(input: { host?: string; projectId?: string; tenantId: string }): void {
  if (!/^(127\.0\.0\.1|localhost):[0-9]{2,5}$/.test(input.host ?? '')
    || !/^demo-[a-z0-9-]+$/.test(input.projectId ?? '')
    || !TENANT_PATTERN.test(input.tenantId) || !input.tenantId.endsWith('-demo')) {
    throw new Error('Migração permitida APENAS no Firestore Emulator localhost, projeto demo- e tenant *-demo.');
  }
}

// A strict projection: never move customer PII, brand identity, contact, Auth memberships or reservations.
export function projectFoodLegacyDocument(type: FoodLegacyCollection, id: string, raw: JsonObject, tenantId: string): JsonObject {
  if (!ID_PATTERN.test(id) || !TENANT_PATTERN.test(tenantId) || !tenantId.endsWith('-demo')) throw new Error('Identificador inválido.');
  if (type === 'menuItems') {
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const categoryId = typeof raw.categoryId === 'string' ? raw.categoryId.trim() : '';
    const priceCents = raw.priceCents;
    if (name.length < 2 || name.length > 120 || description.length > 500 ||
      categoryId.length < 1 || categoryId.length > 100 ||
      !Number.isSafeInteger(priceCents) || (priceCents as number) < 0 || (priceCents as number) > 10_000_000 ||
      typeof raw.active !== 'boolean') throw new Error('Item legado incompatível com o schema Food.');
    return { id, tenantId, name, description, categoryId, priceCents, active: raw.active };
  }
  if (type === 'tables') {
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const capacity = raw.capacity;
    if (name.length < 2 || name.length > 80 || !Number.isSafeInteger(capacity) ||
      (capacity as number) < 1 || (capacity as number) > 20 ||
      typeof raw.active !== 'boolean' || !['AVAILABLE', 'MAINTENANCE', 'OCCUPIED', 'RESERVED'].includes(String(raw.state))) {
      throw new Error('Mesa legada incompatível com o schema Food.');
    }
    // An occupied/reserved legacy table is never silently made available in a demo.
    const state = raw.state === 'AVAILABLE' ? 'AVAILABLE' : 'MAINTENANCE';
    return { id, tenantId, name, capacity, active: raw.active === true && state === 'AVAILABLE', state };
  }
  throw new Error('Coleção fora da lista permitida.');
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as JsonObject)
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  }
  return value;
}
async function checksum(value: JsonObject): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(JSON.stringify(canonical(value)))));
  return Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
}
function ledgerId(type: FoodLegacyCollection, id: string): string { return type + '__' + id; }
function ledgerRef(db: Firestore, tenant: string, type: FoodLegacyCollection, id: string) {
  return doc(db, 'tenants', tenant, 'migrationLedger', ledgerId(type, id));
}
function targetRef(db: Firestore, tenant: string, type: FoodLegacyCollection, id: string) {
  return doc(db, 'tenants', tenant, type, id);
}
async function verifyDemoTenant(db: Firestore, tenantId: string): Promise<void> {
  const record = await getDoc(doc(db, 'tenants', tenantId));
  const data = record.data();
  if (!record.exists() || data?.id !== tenantId || data?.kind !== 'DEMO' ||
    data?.subscriptionStatus !== 'demo' || data?.linkedLeadId + '-demo' !== tenantId) {
    throw new Error('Destino não é um tenant DEMO registrado; migração bloqueada.');
  }
}
async function snapshotSources(db: Firestore, tenantId: string) {
  const result: Array<{ collection: FoodLegacyCollection; id: string; target: JsonObject; checksum: string }> = [];
  for (const type of ['menuItems', 'tables'] as const) {
    const snapshot = await getDocs(collection(db, type));
    if (snapshot.size > 200) throw new Error('Mais de 200 documentos na coleção; operação recusada.');
    for (const item of snapshot.docs) {
      const target = projectFoodLegacyDocument(type, item.id, item.data(), tenantId);
      result.push({ collection: type, id: item.id, target, checksum: await checksum(target) });
    }
  }
  return result.sort((a, b) => (a.collection + a.id).localeCompare(b.collection + b.id));
}
async function inspectEntry(db: Firestore, tenantId: string, source: Awaited<ReturnType<typeof snapshotSources>>[number]): Promise<FoodMigrationEntry> {
  const [existing, ledger] = await Promise.all([
    getDoc(targetRef(db, tenantId, source.collection, source.id)),
    getDoc(ledgerRef(db, tenantId, source.collection, source.id)),
  ]);
  let status: FoodMigrationStatus = 'CREATE';
  if (ledger.exists()) {
    const history = ledger.data() as MigrationLedger;
    if (!existing.exists() || history.migrationId !== FOOD_MIGRATION_ID || history.tenantId !== tenantId ||
      history.sourcePath !== source.collection + '/' + source.id ||
      history.targetPath !== 'tenants/' + tenantId + '/' + source.collection + '/' + source.id ||
      history.checksum !== source.checksum || await checksum(existing.data()) !== source.checksum) {
      status = 'DRIFT';
    } else status = 'ALREADY_APPLIED';
  } else if (existing.exists()) status = 'CONFLICT';
  return { collection: source.collection, id: source.id,
    path: 'tenants/' + tenantId + '/' + source.collection + '/' + source.id,
    status, checksum: source.checksum };
}
export async function planFoodLegacyMigration(db: Firestore, tenantId: string): Promise<FoodMigrationEntry[]> {
  await verifyDemoTenant(db, tenantId);
  const items = await snapshotSources(db, tenantId);
  const entries: FoodMigrationEntry[] = [];
  for (const item of items) entries.push(await inspectEntry(db, tenantId, item));
  return entries;
}
export async function applyFoodLegacyMigration(db: Firestore, tenantId: string): Promise<{ created: number; unchanged: number }> {
  await verifyDemoTenant(db, tenantId);
  const sources = await snapshotSources(db, tenantId);
  const manifest = await Promise.all(sources.map(s => inspectEntry(db, tenantId, s)));
  if (manifest.some(e => e.status === 'DRIFT' || e.status === 'CONFLICT')) {
    throw new Error('Preflight recusado: destino preexistente ou divergente. Não sobrescrever.');
  }
  let created = 0;
  let unchanged = 0;
  for (const source of sources) {
    const result = await runTransaction(db, async tx => {
      const target = targetRef(db, tenantId, source.collection, source.id);
      const ledger = ledgerRef(db, tenantId, source.collection, source.id);
      const [oldTarget, oldLedger, tenant] = await Promise.all([tx.get(target), tx.get(ledger), tx.get(doc(db, 'tenants', tenantId))]);
      if (!tenant.exists() || tenant.data().kind !== 'DEMO' || tenant.data().subscriptionStatus !== 'demo') throw new Error('Tenant deixou de ser demo.');
      if (oldLedger.exists()) {
        const previous = oldLedger.data() as MigrationLedger;
        if (!oldTarget.exists() || previous.migrationId !== FOOD_MIGRATION_ID ||
          previous.checksum !== source.checksum || await checksum(oldTarget.data()) !== source.checksum) throw new Error('Drift durante migração.');
        return 'unchanged' as const;
      }
      if (oldTarget.exists()) throw new Error('Conflito durante migração: documento preexistente.');
      tx.set(target, source.target);
      tx.set(ledger, {
        migrationId: FOOD_MIGRATION_ID, tenantId,
        sourcePath: source.collection + '/' + source.id,
        targetPath: 'tenants/' + tenantId + '/' + source.collection + '/' + source.id,
        checksum: source.checksum, createdAt: new Date().toISOString(),
      } satisfies MigrationLedger);
      return 'created' as const;
    });
    if (result === 'created') created++; else unchanged++;
  }
  return { created, unchanged };
}
export async function rollbackFoodLegacyMigration(db: Firestore, tenantId: string): Promise<number> {
  await verifyDemoTenant(db, tenantId);
  const ledgerDocs = (await getDocs(collection(db, 'tenants', tenantId, 'migrationLedger'))).docs;
  if (ledgerDocs.length > 400) throw new Error('Manifesto excede limite seguro.');
  const checked: Array<{ id: string; type: FoodLegacyCollection; history: MigrationLedger }> = [];
  // Preflight first: no delete if any target was altered or does not belong to this migration.
  for (const row of ledgerDocs) {
    const history = row.data() as MigrationLedger;
    const type = history.sourcePath?.split('/')[0];
    const id = history.sourcePath?.split('/')[1];
    if ((type !== 'menuItems' && type !== 'tables') || !id || !ID_PATTERN.test(id) ||
      history.migrationId !== FOOD_MIGRATION_ID || history.tenantId !== tenantId ||
      row.id !== ledgerId(type, id) ||
      history.targetPath !== 'tenants/' + tenantId + '/' + type + '/' + id) throw new Error('Manifesto desconhecido: rollback recusado.');
    const target = await getDoc(targetRef(db, tenantId, type, id));
    if (!target.exists() || await checksum(target.data()) !== history.checksum) throw new Error('Documento alterado: rollback recusado.');
    checked.push({ id, type, history });
  }
  for (const { type, id, history } of checked) {
    await runTransaction(db, async tx => {
      const target = targetRef(db, tenantId, type, id);
      const ledger = ledgerRef(db, tenantId, type, id);
      const [oldTarget, oldLedger] = await Promise.all([tx.get(target), tx.get(ledger)]);
      if (!oldTarget.exists() || !oldLedger.exists() ||
        oldLedger.data().migrationId !== FOOD_MIGRATION_ID || oldLedger.data().checksum !== history.checksum ||
        await checksum(oldTarget.data()) !== history.checksum) throw new Error('Drift durante rollback; nenhuma exclusão permitida neste documento.');
      tx.delete(target);
      tx.delete(ledger);
    });
  }
  return checked.length;
}
