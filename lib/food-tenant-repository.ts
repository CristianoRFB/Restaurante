import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import { isFoodPlatformOwner } from '@/lib/food-platform-repository';
import { buildFoodTenantMenuItem, canManageFoodCatalog, validFoodTenantSlug, type FoodMenuInput, type FoodTenantContext, type FoodTenantMembership, type FoodTenantMenuItem } from '@/shared/food-tenant-domain';
import type { FoodDemoTenant, TenantRole } from '@/shared/food-platform-domain';

function database() {
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('A operação exige Firebase ou Emulator; sem seed como fallback.');
  return firebaseDb;
}
function currentUid(): string {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Sessão autenticada obrigatória.');
  return uid;
}
export async function resolveFoodTenant(slug: string): Promise<FoodTenantContext> {
  if (!validFoodTenantSlug(slug)) throw new Error('Identificador de tenant inválido.');
  const uid = currentUid();
  const db = database();
  const [record, ownMembership, owner] = await Promise.all([
    getDoc(doc(db, 'tenants', slug)),
    getDoc(doc(db, 'tenants', slug, 'memberships', uid)),
    isFoodPlatformOwner(uid),
  ]);
  if (!record.exists()) throw new Error('Tenant inexistente ou acesso não autorizado.');
  const tenant = record.data() as FoodDemoTenant;
  if (tenant.id !== slug || tenant.slug !== slug || tenant.kind !== 'DEMO' || tenant.publiclyListed !== false) {
    throw new Error('Tenant inválido para operação de demonstração.');
  }
  const membership = ownMembership.exists() ? ownMembership.data() as FoodTenantMembership : null;
  if (!owner && (!membership?.active || tenant.status !== 'DEMO')) {
    throw new Error('Sem acesso ao tenant ou demonstração suspensa.');
  }
  const role = membership?.active ? membership.role : null;
  return {
    tenant, uid, isPlatformOwner: owner, membership,
    canManageCatalog: owner || canManageFoodCatalog(role),
    canManageMembers: owner || role === 'tenant_owner',
  };
}
export async function listFoodTenantMenuItems(ctx: FoodTenantContext): Promise<FoodTenantMenuItem[]> {
  const snapshot = await getDocs(collection(database(), 'tenants', ctx.tenant.id, 'menuItems'));
  return snapshot.docs.map((item) => item.data() as FoodTenantMenuItem)
    .filter((item) => item.tenantId === ctx.tenant.id && item.id.trim() !== '')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
export async function saveFoodTenantMenuItem(ctx: FoodTenantContext, input: FoodMenuInput, itemId?: string): Promise<string> {
  if (!ctx.canManageCatalog || ctx.tenant.status !== 'DEMO') throw new Error('Permissão insuficiente ou tenant suspenso.');
  const id = itemId ?? ('p-' + crypto.randomUUID());
  const item = buildFoodTenantMenuItem(ctx.tenant.id, id, input);
  // Firestore rules enforce current membership/status, regardless of stale frontend ctx.
  await setDoc(doc(database(), 'tenants', ctx.tenant.id, 'menuItems', id), item);
  return id;
}
export async function removeFoodTenantMenuItem(ctx: FoodTenantContext, itemId: string): Promise<void> {
  if (!ctx.canManageCatalog || ctx.tenant.status !== 'DEMO') throw new Error('Permissão insuficiente ou tenant suspenso.');
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(itemId)) throw new Error('Identificador de produto inválido.');
  await deleteDoc(doc(database(), 'tenants', ctx.tenant.id, 'menuItems', itemId));
}
export async function listFoodTenantMembers(ctx: FoodTenantContext): Promise<FoodTenantMembership[]> {
  if (!ctx.canManageMembers) throw new Error('Sem permissão para listar equipe.');
  const records = await getDocs(collection(database(), 'tenants', ctx.tenant.id, 'memberships'));
  return records.docs.map((item) => item.data() as FoodTenantMembership).sort((a, b) => a.uid.localeCompare(b.uid));
}
export async function upsertFoodTenantMember(ctx: FoodTenantContext, uid: string, role: TenantRole, active: boolean): Promise<void> {
  if (!ctx.canManageMembers || ctx.tenant.status !== 'DEMO') throw new Error('Sem permissão para gerir equipe.');
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(uid)) throw new Error('UID inválido.');
  if (!['MANAGER', 'CASHIER', 'SERVICE'].includes(role) && !(ctx.isPlatformOwner && ['tenant_owner', 'ADMIN'].includes(role))) {
    throw new Error('Papel não permitido.');
  }
  const ref = doc(database(), 'tenants', ctx.tenant.id, 'memberships', uid);
  const current = await getDoc(ref);
  if (!ctx.isPlatformOwner && current.exists() && !['MANAGER', 'CASHIER', 'SERVICE'].includes((current.data() as FoodTenantMembership).role)) {
    throw new Error('Não é permitido alterar tenant_owner ou ADMIN.');
  }
  await setDoc(ref, { uid, role, active } satisfies FoodTenantMembership);
}
export async function revokeFoodTenantMember(ctx: FoodTenantContext, uid: string): Promise<void> {
  if (!ctx.canManageMembers || ctx.tenant.status !== 'DEMO') throw new Error('Sem permissão para revogar acesso.');
  const ref = doc(database(), 'tenants', ctx.tenant.id, 'memberships', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Membro não encontrado.');
  const member = snap.data() as FoodTenantMembership;
  if (!ctx.isPlatformOwner && !['MANAGER', 'CASHIER', 'SERVICE'].includes(member.role)) throw new Error('Papel protegido.');
  await updateDoc(ref, { active: false });
}
