import { describe, expect, it, vi } from 'vitest';
import { FoodTenantAccessError, resolveTrustedFoodWorkerContext, type FoodTenantWorkerLookup } from '@/shared/food-worker-tenant';
import { newFoodLead, newFoodDemoTenant } from '@/shared/food-platform-domain';

const tenantA = newFoodDemoTenant(newFoodLead('Food Alpha', 'cadastro_manual', '', '2026-10-27T12:00:00.000Z'), '2026-10-27T12:00:00.000Z');
const tenantB = newFoodDemoTenant(newFoodLead('Food Beta', 'cadastro_manual', '', '2026-10-27T12:00:00.000Z'), '2026-10-27T12:00:00.000Z');
function provider(): FoodTenantWorkerLookup {
  return {
    tenant: vi.fn(async (slug) => (slug === tenantA.id ? tenantA : slug === tenantB.id ? tenantB : null)),
    platformAdmin: vi.fn(async (uid) => uid === 'platform' ? { role: 'platform_owner', active: true } : null),
    member: vi.fn(async (slug, uid) => {
      if (slug === tenantA.id && uid === 'memberA') return { uid, role: 'MANAGER' as const, active: true };
      if (slug === tenantB.id && uid === 'memberB') return { uid, role: 'SERVICE' as const, active: true };
      if (slug === tenantA.id && uid === 'revoked') return { uid, role: 'MANAGER' as const, active: false };
      return null;
    }),
  };
}
describe('Food Worker tenant authorization', () => {
  it('permite manager A no A e nega ao mesmo usuário acesso ao B', async () => {
    const lookup = provider();
    const context = await resolveTrustedFoodWorkerContext(tenantA.slug, 'memberA', lookup);
    expect(context).toMatchObject({ tenantId: tenantA.id, permissions: { platformOwner: false, canManageCatalog: true, canManageMembers: false } });
    await expect(resolveTrustedFoodWorkerContext(tenantB.slug, 'memberA', lookup)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('permite atendimento de B ler B sem poderes de gestão', async () => {
    const result = await resolveTrustedFoodWorkerContext(tenantB.slug, 'memberB', provider());
    expect(result.permissions.canManageCatalog).toBe(false);
  });
  it('revogado, anônimo, tenant inexistente e slug malicioso não atravessam a fronteira', async () => {
    await expect(resolveTrustedFoodWorkerContext(tenantA.slug, 'revoked', provider())).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(resolveTrustedFoodWorkerContext(tenantA.slug, null, provider())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(resolveTrustedFoodWorkerContext('tenant-inexistente', 'memberA', provider())).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(resolveTrustedFoodWorkerContext('../tenants/other', 'memberA', provider())).rejects.toBeInstanceOf(FoodTenantAccessError);
  });
  it('suspensão bloqueia staff, mas Platform Owner conserva acesso de governança', async () => {
    const suspended = { ...tenantA, status: 'SUSPENDED' as const };
    const lookup: FoodTenantWorkerLookup = {
      ...provider(), tenant: async (slug) => slug === suspended.slug ? suspended : null,
    };
    await expect(resolveTrustedFoodWorkerContext(suspended.slug, 'memberA', lookup)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const owner = await resolveTrustedFoodWorkerContext(suspended.slug, 'platform', lookup);
    expect(owner.status).toBe('SUSPENDED');
    expect(owner.permissions.platformOwner).toBe(true);
  });
  it('não confia em tenant falso com ID divergente ao path', async () => {
    const spoof: FoodTenantWorkerLookup = { ...provider(), tenant: async () => tenantB };
    await expect(resolveTrustedFoodWorkerContext(tenantA.slug, 'memberA', spoof)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
