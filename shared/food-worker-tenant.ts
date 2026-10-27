import { validFoodTenantSlug, canManageFoodCatalog } from '@/shared/food-tenant-domain';
import type { FoodDemoTenant, TenantRole } from '@/shared/food-platform-domain';
import type { FoodTenantMembership } from '@/shared/food-tenant-domain';

export class FoodTenantAccessError extends Error {
  constructor(public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND', message: string) {
    super(message); this.name = 'FoodTenantAccessError';
  }
}

export interface FoodTenantWorkerLookup {
  tenant: (tenantId: string) => Promise<FoodDemoTenant | null>;
  platformAdmin: (uid: string) => Promise<{ role?: string; active?: boolean } | null>;
  member: (tenantId: string, uid: string) => Promise<FoodTenantMembership | null>;
}

export interface TrustedFoodWorkerContext {
  tenantId: string;
  slug: string;
  uid: string;
  status: FoodDemoTenant['status'];
  branding: FoodDemoTenant['branding'];
  permissions: { platformOwner: boolean; canManageCatalog: boolean; canManageMembers: boolean };
}

export async function resolveTrustedFoodWorkerContext(slug: string, uid: string | null, lookup: FoodTenantWorkerLookup): Promise<TrustedFoodWorkerContext> {
  if (!uid) throw new FoodTenantAccessError('UNAUTHORIZED', 'É necessário autenticar-se.');
  if (!validFoodTenantSlug(slug)) throw new FoodTenantAccessError('NOT_FOUND', 'Tenant inexistente.');
  // The server uses the route slug to construct the document path; never trusts a body tenantId.
  const tenant = await lookup.tenant(slug);
  if (!tenant || tenant.id !== slug || tenant.slug !== slug || tenant.kind !== 'DEMO' || tenant.publiclyListed !== false
      || !['DEMO', 'SUSPENDED'].includes(tenant.status)) {
    throw new FoodTenantAccessError('NOT_FOUND', 'Tenant inexistente.');
  }
  const [admin, membership] = await Promise.all([lookup.platformAdmin(uid), lookup.member(slug, uid)]);
  const isPlatformOwner = admin?.role === 'platform_owner' && admin.active === true;
  const role: TenantRole | null = membership?.active && membership.uid === uid ? membership.role : null;
  if (!isPlatformOwner && (!role || tenant.status !== 'DEMO')) {
    throw new FoodTenantAccessError('FORBIDDEN', 'Sem acesso a este tenant.');
  }
  return {
    tenantId: tenant.id, slug: tenant.slug, uid, status: tenant.status, branding: tenant.branding,
    permissions: {
      platformOwner: isPlatformOwner,
      canManageCatalog: isPlatformOwner || canManageFoodCatalog(role),
      canManageMembers: isPlatformOwner || role === 'tenant_owner',
    },
  };
}
