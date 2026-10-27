import { describe, expect, it } from 'vitest';
import { buildFoodTenantMenuItem, canManageFoodCatalog, parseFoodReaisToCents, validFoodTenantSlug } from '@/shared/food-tenant-domain';

describe('tenant Food: catálogo isolado e preços', () => {
  it('formata preço BRL sem drift de float e recusa valores inválidos', () => {
    expect(parseFoodReaisToCents('12,30')).toBe(1230);
    expect(parseFoodReaisToCents('0.99')).toBe(99);
    expect(parseFoodReaisToCents('100')).toBe(10000);
    expect(() => parseFoodReaisToCents('1,234')).toThrow();
    expect(() => parseFoodReaisToCents('-1')).toThrow();
    expect(() => parseFoodReaisToCents('100001')).toThrow();
    expect(() => parseFoodReaisToCents('Infinity')).toThrow();
  });
  it('fixa tenantId pelo contexto, não aceita ID divergente nem preço negativo', () => {
    const item = buildFoodTenantMenuItem('restaurante-demo', 'p-abc_01', { name: '  Pizza  ', description: ' Queijo ', categoryId: 'pizzas', priceCents: 2990, active: true });
    expect(item).toMatchObject({ tenantId: 'restaurante-demo', id: 'p-abc_01', name: 'Pizza', description: 'Queijo' });
    expect(() => buildFoodTenantMenuItem('invalid/tenant', 'p-abc_01', { name: 'Pizza', description: '', categoryId: 'pizzas', priceCents: 2000, active: true })).toThrow();
    expect(() => buildFoodTenantMenuItem('restaurante-demo', '../p', { name: 'Pizza', description: '', categoryId: 'pizzas', priceCents: 2000, active: true })).toThrow();
    expect(() => buildFoodTenantMenuItem('restaurante-demo', 'p-abc_01', { name: 'Pizza', description: '', categoryId: 'pizzas', priceCents: -1, active: true })).toThrow();
  });
  it('não concede gestão de catálogo a papéis operacionais nem slugs reservados', () => {
    expect(canManageFoodCatalog('tenant_owner')).toBe(true);
    expect(canManageFoodCatalog('MANAGER')).toBe(true);
    expect(canManageFoodCatalog('CASHIER')).toBe(false);
    expect(canManageFoodCatalog('SERVICE')).toBe(false);
    expect(validFoodTenantSlug('../')).toBe(false);
    expect(validFoodTenantSlug('tenant--bad')).toBe(false);
  });
});
