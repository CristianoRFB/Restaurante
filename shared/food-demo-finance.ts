import type { FoodDemoOrder } from '@/shared/food-demo-order';
import type { FoodTenantContext } from '@/shared/food-tenant-domain';

export interface FoodDemoFinanceSummary {
  orderCount: number;
  itemCount: number;
  simulatedGrossCents: number;
  averageOrderCents: number;
  sampleLimited: boolean;
}
export function canViewFoodDemoFinance(ctx: FoodTenantContext): boolean {
  return ctx.isPlatformOwner || Boolean(ctx.membership?.active &&
    ['tenant_owner', 'ADMIN', 'MANAGER', 'CASHIER'].includes(ctx.membership.role));
}
export function summarizeFoodDemoFinance(tenantId: string, orders: FoodDemoOrder[], limited = false): FoodDemoFinanceSummary {
  let itemCount = 0;
  let grossCents = 0;
  const seen = new Set<string>();
  for (const order of orders) {
    if (order.tenantId !== tenantId || order.demoOnly !== true ||
      order.paymentRequired !== false || order.status !== 'DEMO_RECEIVED' ||
      !/^[a-zA-Z0-9_-]{16,80}$/.test(order.id) || seen.has(order.id) ||
      !Array.isArray(order.items) || order.items.length < 1 || order.items.length > 25) {
      throw new Error('Dados simulados inválidos ou provenientes de outro tenant.');
    }
    seen.add(order.id);
    let expected = 0;
    for (const line of order.items) {
      if (!Number.isSafeInteger(line.priceCents) || line.priceCents < 0 ||
        !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 20 ||
        !Number.isSafeInteger(line.lineCents) || line.lineCents !== line.priceCents * line.quantity) {
        throw new Error('Item de demonstração inconsistente.');
      }
      itemCount += line.quantity;
      expected += line.lineCents;
    }
    if (!Number.isSafeInteger(order.subtotalCents) || order.subtotalCents !== expected ||
      order.subtotalCents < 0 || order.subtotalCents > 10_000_000) {
      throw new Error('Subtotal demonstrativo inconsistente.');
    }
    grossCents += expected;
    if (!Number.isSafeInteger(grossCents)) throw new Error('Total demonstrativo excedeu limite numérico.');
  }
  return {
    orderCount: orders.length, itemCount, simulatedGrossCents: grossCents,
    averageOrderCents: orders.length ? Math.round(grossCents / orders.length) : 0,
    sampleLimited: limited,
  };
}
