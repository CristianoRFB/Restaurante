import type { FoodDemoOrderStore, FoodDemoOrder } from '@/shared/food-demo-order';
import type { FoodDemoTenant } from '@/shared/food-platform-domain';
import type { FoodTenantMembership, FoodTenantMenuItem } from '@/shared/food-tenant-domain';

type FireValue = {
  stringValue?: string; integerValue?: string; booleanValue?: boolean;
  nullValue?: string; mapValue?: { fields?: Record<string, FireValue> };
  arrayValue?: { values?: FireValue[] };
};
type FireDoc = { fields?: Record<string, FireValue> };
type FireError = { error?: { status?: string; code?: number } };

export class FoodFirestoreConflict extends Error {}
const safeSegment = /^[a-zA-Z0-9_-]{1,128}$/;

function firestoreRoot(): string {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (!/^demo-[a-z0-9-]+$/.test(project)) throw new Error('Pedidos demo exigem projeto Firebase demo-.');
  const emulator = process.env.FIRESTORE_EMULATOR_HOST || '';
  if (!/^(127\.0\.0\.1|localhost):[0-9]{2,5}$/.test(emulator)) throw new Error('Pedidos demo exigem Firestore Emulator local.');
  return 'http://' + emulator + '/v1/projects/' + project + '/databases/(default)/documents';
}
export function foodDemoOrdersEnabled(): boolean {
  try {
    return process.env.FOOD_DEMO_ORDERS_MODE === 'emulator' && Boolean(firestoreRoot());
  } catch { return false; }
}
function path(segments: string[]): string {
  if (segments.length < 2 || segments.length % 2 !== 0 || segments.some((p) => !safeSegment.test(p))) {
    throw new Error('Caminho Firebase inválido.');
  }
  return segments.map(encodeURIComponent).join('/');
}
function decode(v: FireValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(decode);
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, a]) => [k, decode(a)]));
  return null;
}
function encode(value: unknown): FireValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isSafeInteger(value)) return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (value && typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
  return { nullValue: 'NULL_VALUE' };
}
async function firestore(pathSuffix: string, options: RequestInit = {}): Promise<Response> {
  // Emulator is the only permitted target; service account is NEVER sent to loopback.
  const url = firestoreRoot() + pathSuffix;
  return fetch(url, {
    ...options,
    // Emulator-only privileged REST call; NEVER transmit the magic owner token to remote endpoints.
    headers: { 'content-type': 'application/json', authorization: 'Bearer owner', ...options.headers },
    signal: AbortSignal.timeout(10_000),
  });
}
export async function beginFoodDemoTransaction(): Promise<string> {
  if (!foodDemoOrdersEnabled()) throw new Error('Transações Food DEMO estão desabilitadas.');
  const response = await firestore(':beginTransaction', { method: 'POST', body: JSON.stringify({ options: { readWrite: {} } }) });
  if (!response.ok) throw new Error('Falha ao iniciar transação de demonstração.');
  const data = await response.json() as { transaction?: string };
  if (!data.transaction) throw new Error('Transação de demonstração ausente.');
  return data.transaction;
}
export async function getFoodTxDocument(segments: string[], transaction: string): Promise<Record<string, unknown> | null> {
  // Firestore's batchGet documents RPC supports a transaction snapshot and
  // returns an explicit 'missing' projection for absent records.
  const name = firestoreRoot().replace(/^https?:\/\/[^/]+\/v1\//, '') + '/' + path(segments);
  const response = await firestore(':batchGet', {
    method: 'POST',
    body: JSON.stringify({ documents: [name], transaction }),
  });
  if (!response.ok) throw new Error('Falha na leitura transacional Firebase.');
  const raw = (await response.text()).trim();
  // The REST gateway may return NDJSON (streamed) or a single object for one document.
  const values = raw.split('\n').filter(Boolean).map((line) => JSON.parse(line) as {
    found?: FireDoc;
    missing?: string;
  });
  if (values.length !== 1) throw new Error('Leitura transacional retornou quantidade inesperada de documentos.');
  if (values[0].missing) return null;
  if (!values[0].found) throw new Error('Resposta transacional sem documento.');
  return Object.fromEntries(Object.entries(values[0].found.fields || {}).map(([k, v]) => [k, decode(v)]));
}
export async function createFoodTxOrder(order: FoodDemoOrder, transaction: string): Promise<void> {
  const documentName = firestoreRoot().replace(/^https?:\/\/[^/]+\/v1\//, '') + '/' + path(['tenants', order.tenantId, 'orders', order.id]);
  const response = await firestore(':commit', { method: 'POST', body: JSON.stringify({
    transaction,
    writes: [{
      update: { name: documentName, fields: Object.fromEntries(Object.entries(order).map(([k, v]) => [k, encode(v)])) },
      currentDocument: { exists: false },
    }],
  }) });
  if (response.status === 409 || response.status === 412) throw new FoodFirestoreConflict('Conflito concorrente; repita com o mesmo requestId.');
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as FireError;
    if (data.error?.status === 'ABORTED' || data.error?.status === 'ALREADY_EXISTS' || data.error?.status === 'FAILED_PRECONDITION') {
      throw new FoodFirestoreConflict('Conflito concorrente; repita com o mesmo requestId.');
    }
    throw new Error('Falha ao salvar pedido demo em transação.');
  }
}
export async function rollbackFoodDemoTransaction(transaction: string): Promise<void> {
  await firestore(':rollback', { method: 'POST', body: JSON.stringify({ transaction }) }).catch(() => undefined);
}

export function makeFoodDemoTransactionStore(transaction: string): FoodDemoOrderStore {
  return {
    tenant: (tenantId) => getFoodTxDocument(['tenants', tenantId], transaction) as Promise<FoodDemoTenant | null>,
    platformAdmin: (uid) => getFoodTxDocument(['platformAdmins', uid], transaction),
    member: (tenantId, uid) => getFoodTxDocument(['tenants', tenantId, 'memberships', uid], transaction) as Promise<FoodTenantMembership | null>,
    product: (tenantId, productId) => getFoodTxDocument(['tenants', tenantId, 'menuItems', productId], transaction) as Promise<FoodTenantMenuItem | null>,
    order: (tenantId, orderId) => getFoodTxDocument(['tenants', tenantId, 'orders', orderId], transaction) as Promise<FoodDemoOrder | null>,
    createOrderIfAbsent: (order) => createFoodTxOrder(order, transaction),
  };
}
