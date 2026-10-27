import { describe, expect, it, vi } from 'vitest';
import { newFoodDemoTenant, newFoodLead } from '@/shared/food-platform-domain';
import { placeFoodDemoOrder, FoodDemoOrderError, type FoodDemoOrder, type FoodDemoOrderStore } from '@/shared/food-demo-order';

const time = '2026-10-27T12:00:00.000Z';
const tenantA = newFoodDemoTenant(newFoodLead('Food Restaurante A', 'cadastro_manual', '', time), time);
const tenantB = newFoodDemoTenant(newFoodLead('Food Restaurante B', 'cadastro_manual', '', time), time);
const makeProduct = (tenantId: string, id = 'prato001', price = 1599) => ({
  id, tenantId, name: 'Prato fictício', description: 'Sem preparo real', categoryId: 'pratos', priceCents: price, active: true,
});
const payload = { clientRequestId: 'demo-request-abc12345', items: [{ productId: 'prato001', quantity: 3 }] };

function setup() {
  const written = new Map<string, FoodDemoOrder>();
  const store: FoodDemoOrderStore = {
    tenant: async (id) => id === tenantA.id ? tenantA : id === tenantB.id ? tenantB : null,
    platformAdmin: async () => null,
    member: async (tenantId, uid) => tenantId === tenantA.id && uid === 'userA' ? { uid, role: 'MANAGER', active: true } :
      tenantId === tenantB.id && uid === 'userB' ? { uid, role: 'SERVICE', active: true } : null,
    product: vi.fn(async (id) => id === tenantA.id ? makeProduct(tenantA.id) : id === tenantB.id ? makeProduct(tenantB.id, 'prato001', 5200) : null),
    order: async (id, key) => written.get(id + '/' + key) || null,
    createOrderIfAbsent: async (order) => {
      const key = order.tenantId + '/' + order.id;
      if (written.has(key)) throw new FoodDemoOrderError('CONFLICT', 'Write precondition exists:false');
      written.set(key, order);
    },
  };
  return { store, written };
}

describe('pedidos de demonstração Food — domínio/isolamento', () => {
  it('precifica no servidor com catálogo A, sem aceitar preço/tenant do navegador', async () => {
    const { store } = setup();
    const value = await placeFoodDemoOrder(tenantA.slug, 'userA', payload, store, time);
    expect(value).toMatchObject({ created: true, order: { tenantId: tenantA.id, subtotalCents: 4797, status: 'DEMO_RECEIVED', demoOnly: true, paymentRequired: false } });
    expect(value.order.items[0]).toMatchObject({ quantity: 3, priceCents: 1599, lineCents: 4797 });
    expect(Object.prototype.hasOwnProperty.call(value.order, 'whatsapp')).toBe(false);
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', { ...payload, tenantId: tenantB.id }, store)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', { ...payload, totalCents: 1 }, store)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('permite replay idempotente de mesmo payload, mas não reutilização com quantidade diferente', async () => {
    const { store } = setup();
    const first = await placeFoodDemoOrder(tenantA.slug, 'userA', payload, store, time);
    const retry = await placeFoodDemoOrder(tenantA.slug, 'userA', payload, store, time);
    expect(retry.created).toBe(false);
    expect(retry.order).toEqual(first.order);
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', { ...payload, items: [{ productId: 'prato001', quantity: 4 }] }, store)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('nega cruzamento tenant A/B e não compartilha carrinho/preço/idempotência', async () => {
    const { store, written } = setup();
    await placeFoodDemoOrder(tenantA.slug, 'userA', payload, store);
    await expect(placeFoodDemoOrder(tenantB.slug, 'userA', payload, store)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const resultB = await placeFoodDemoOrder(tenantB.slug, 'userB', payload, store);
    expect(resultB.order.subtotalCents).toBe(15600);
    expect(written.size).toBe(2);
  });
  it('bloqueia produto de outro tenant, inativo, duplicado e montante fora do limite', async () => {
    const { store } = setup();
    store.product = async () => makeProduct(tenantB.id);
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', payload, store)).rejects.toMatchObject({ code: 'VALIDATION' });
    store.product = async () => ({ ...makeProduct(tenantA.id), active: false });
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', payload, store)).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', { ...payload, items: [payload.items[0], payload.items[0]] }, store)).rejects.toMatchObject({ code: 'VALIDATION' });
    store.product = async () => makeProduct(tenantA.id, 'prato001', 9000000);
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', payload, store)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('nega revogado e suspensão até para plataforma; não gera cobrança ou pedido real', async () => {
    const { store } = setup();
    store.member = async () => null;
    await expect(placeFoodDemoOrder(tenantA.slug, 'userA', payload, store)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    store.platformAdmin = async () => ({ role: 'platform_owner', active: true });
    store.tenant = async () => ({ ...tenantA, status: 'SUSPENDED' });
    await expect(placeFoodDemoOrder(tenantA.slug, 'platform', payload, store)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('testa concorrência com precondition única: só um commit pode criar', async () => {
    const { store, written } = setup();
    const result = await Promise.allSettled([
      placeFoodDemoOrder(tenantA.slug, 'userA', payload, store),
      placeFoodDemoOrder(tenantA.slug, 'userA', payload, store),
    ]);
    expect(result.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((x) => x.status === 'rejected')).toHaveLength(1);
    expect(written.size).toBe(1);
  });
});
