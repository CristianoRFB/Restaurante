import { z } from 'zod';
import { FoodTenantAccessError, resolveTrustedFoodWorkerContext, type FoodTenantWorkerLookup } from '@/shared/food-worker-tenant';
import type { FoodTenantMenuItem } from '@/shared/food-tenant-domain';

export const foodDemoOrderSchema = z.object({
  clientRequestId: z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/),
  items: z.array(z.object({
    productId: z.string().regex(/^[a-zA-Z0-9_-]{3,100}$/),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(25),
}).strict();

export type FoodDemoOrderInput = z.infer<typeof foodDemoOrderSchema>;
export interface FoodDemoOrder {
  id: string;
  tenantId: string;
  customerUid: string;
  requestFingerprint: string;
  status: 'DEMO_RECEIVED';
  demoOnly: true;
  paymentRequired: false;
  fulfillment: 'SIMULATED_PICKUP';
  items: Array<{ productId: string; name: string; quantity: number; priceCents: number; lineCents: number }>;
  subtotalCents: number;
  createdAt: string;
}

export class FoodDemoOrderError extends Error {
  constructor(public readonly code: 'VALIDATION' | 'CONFLICT' | 'UNAVAILABLE', message: string) {
    super(message);
    this.name = 'FoodDemoOrderError';
  }
}

export interface FoodDemoOrderStore extends FoodTenantWorkerLookup {
  product: (tenantId: string, productId: string) => Promise<FoodTenantMenuItem | null>;
  order: (tenantId: string, requestId: string) => Promise<FoodDemoOrder | null>;
  createOrderIfAbsent: (order: FoodDemoOrder) => Promise<void>;
}

export function parseFoodDemoOrder(input: unknown): FoodDemoOrderInput {
  const parsed = foodDemoOrderSchema.safeParse(input);
  if (!parsed.success) throw new FoodDemoOrderError('VALIDATION', 'Pedido de demonstração inválido.');
  const unique = new Set(parsed.data.items.map((item) => item.productId));
  if (unique.size !== parsed.data.items.length) throw new FoodDemoOrderError('VALIDATION', 'Item duplicado: use quantidade.');
  return parsed.data;
}

async function fingerprint(tenantId: string, uid: string, input: FoodDemoOrderInput): Promise<string> {
  const canonical = JSON.stringify({
    tenantId, uid, clientRequestId: input.clientRequestId,
    items: [...input.items].sort((a, b) => a.productId.localeCompare(b.productId)),
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function placeFoodDemoOrder(
  slug: string, uid: string, untrustedInput: unknown, store: FoodDemoOrderStore,
  now = new Date().toISOString(),
): Promise<{ created: boolean; order: FoodDemoOrder }> {
  const input = parseFoodDemoOrder(untrustedInput);
  const context = await resolveTrustedFoodWorkerContext(slug, uid, store);
  // Platform Owner may inspect suspended tenants, but nobody may place orders there.
  if (context.status !== 'DEMO') throw new FoodTenantAccessError('FORBIDDEN', 'Demonstração suspensa.');
  const hash = await fingerprint(context.tenantId, uid, input);
  const existing = await store.order(context.tenantId, input.clientRequestId);
  if (existing) {
    if (existing.tenantId !== context.tenantId || existing.customerUid !== uid
      || existing.requestFingerprint !== hash || existing.demoOnly !== true) {
      throw new FoodDemoOrderError('CONFLICT', 'Chave de idempotência já utilizada em outro pedido.');
    }
    return { created: false, order: existing };
  }
  const lines = await Promise.all(input.items.map(async ({ productId, quantity }) => {
    const product = await store.product(context.tenantId, productId);
    if (!product || !product.active || product.id !== productId || product.tenantId !== context.tenantId
      || !Number.isSafeInteger(product.priceCents) || product.priceCents < 0 || product.priceCents > 10_000_000) {
      throw new FoodDemoOrderError('VALIDATION', 'Produto indisponível neste restaurante.');
    }
    return { productId, name: product.name, quantity, priceCents: product.priceCents, lineCents: product.priceCents * quantity };
  }));
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > 10_000_000) {
    throw new FoodDemoOrderError('VALIDATION', 'Valor máximo de demonstração excedido.');
  }
  const order: FoodDemoOrder = {
    id: input.clientRequestId, tenantId: context.tenantId, customerUid: uid,
    requestFingerprint: hash, status: 'DEMO_RECEIVED', demoOnly: true,
    paymentRequired: false, fulfillment: 'SIMULATED_PICKUP',
    items: lines, subtotalCents, createdAt: now,
  };
  // Store must use an atomic create-only write, never an unconditional set.
  await store.createOrderIfAbsent(order);
  return { created: true, order };
}
