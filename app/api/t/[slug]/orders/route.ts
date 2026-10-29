import { FoodTenantAccessError } from '@/shared/food-worker-tenant';
import { limitFoodDemoRequest } from '@/lib/food-worker-rate-limit';
import { FoodWorkerAuthError, verifyFoodFirebaseBearer } from '@/lib/food-worker-firebase';
import { FoodDemoOrderError, placeFoodDemoOrder } from '@/shared/food-demo-order';
import { beginFoodDemoTransaction, foodDemoOrdersEnabled, makeFoodDemoTransactionStore, rollbackFoodDemoTransaction, FoodFirestoreConflict } from '@/lib/food-worker-demo-transaction';

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store, private' };
function response(status: number, value: Record<string, unknown>): Response {
  return new Response(JSON.stringify(value), { status, headers });
}
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  if (!foodDemoOrdersEnabled()) return response(503, { error: 'Checkout demo desabilitado fora do Emulator.' });
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return response(415, { error: 'Envie JSON.' });
  }
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > 12_000) return response(413, { error: 'Pedido muito grande.' });
  let transaction: string | undefined;
  try {
    const uid = await verifyFoodFirebaseBearer(request);
    const limit = await limitFoodDemoRequest(params.slug, uid, 'orders');
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: 'Limite de tentativas da demo atingido.' }), {
        status: 429, headers: { ...headers, 'retry-after': String(limit.retryAfterSeconds) },
      });
    }
    const raw = await request.text();
    if (raw.length > 12_000) return response(413, { error: 'Pedido muito grande.' });
    const payload: unknown = JSON.parse(raw);
    transaction = await beginFoodDemoTransaction();
    const placed = await placeFoodDemoOrder(params.slug, uid, payload, makeFoodDemoTransactionStore(transaction));
    if (!placed.created) await rollbackFoodDemoTransaction(transaction);
    // No payment, customer contact, delivery, reservation, or external notification is triggered.
    return response(placed.created ? 201 : 200, {
      created: placed.created,
      id: placed.order.id,
      tenantId: placed.order.tenantId,
      status: placed.order.status,
      subtotalCents: placed.order.subtotalCents,
      items: placed.order.items,
      demoOnly: true,
    });
  } catch (error) {
    if (transaction) await rollbackFoodDemoTransaction(transaction);
    if (error instanceof SyntaxError || (error instanceof FoodDemoOrderError && error.code === 'VALIDATION')) return response(400, { error: 'Pedido inválido.' });
    if (error instanceof FoodWorkerAuthError) return response(401, { error: 'Não autenticado.' });
    if (error instanceof FoodTenantAccessError) return response(error.code === 'NOT_FOUND' ? 404 : error.code === 'UNAUTHORIZED' ? 401 : 403, { error: 'Acesso ao restaurante negado.' });
    if (error instanceof FoodDemoOrderError || error instanceof FoodFirestoreConflict) return response(409, { error: 'Conflito de pedido. Use o mesmo requestId para repetir.' });
    return response(503, { error: 'Pedidos demonstrativos temporariamente indisponíveis.' });
  }
}
