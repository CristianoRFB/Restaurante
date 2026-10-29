import { FoodWorkerAuthError, verifyFoodFirebaseBearer } from '@/lib/food-worker-firebase';
import { FoodFirestoreConflict, beginFoodDemoTransaction, foodDemoOrdersEnabled, rollbackFoodDemoTransaction } from '@/lib/food-worker-demo-transaction';
import { makeFoodReservationTransactionStore } from '@/lib/food-worker-demo-reservation-store';
import { FoodDemoReservationError, bookFoodDemoReservation } from '@/shared/food-demo-reservation';
import { FoodTenantAccessError } from '@/shared/food-worker-tenant';
import { limitFoodDemoRequest } from '@/lib/food-worker-rate-limit';

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store, private' };
function json(status: number, data: Record<string, unknown>) { return new Response(JSON.stringify(data), { status, headers }); }

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  if (!foodDemoOrdersEnabled()) return json(503, { error: 'Reservas demo desabilitadas fora do Emulator.' });
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json(415, { error: 'Envie JSON.' });
  if (Number(request.headers.get('content-length') || '0') > 2048) return json(413, { error: 'Payload grande demais.' });
  let transaction: string | undefined;
  try {
    const { slug } = await params;
    const uid = await verifyFoodFirebaseBearer(request);
    const limit = await limitFoodDemoRequest(slug, uid, 'reservations');
    if (!limit.allowed) {
      return new Response(JSON.stringify({ error: 'Limite de tentativas da demo atingido.' }), {
        status: 429, headers: { ...headers, 'retry-after': String(limit.retryAfterSeconds) },
      });
    }
    const raw = await request.text();
    if (raw.length > 2048) return json(413, { error: 'Payload grande demais.' });
    const payload: unknown = JSON.parse(raw);
    transaction = await beginFoodDemoTransaction();
    const result = await bookFoodDemoReservation(slug, uid, payload, makeFoodReservationTransactionStore(transaction));
    if (!result.created) await rollbackFoodDemoTransaction(transaction);
    return json(result.created ? 201 : 200, {
      created: result.created, id: result.reservation.id,
      tenantId: result.reservation.tenantId, tableId: result.reservation.tableId,
      date: result.reservation.date, time: result.reservation.time,
      status: result.reservation.status, durationMinutes: result.reservation.durationMinutes,
      demoOnly: true, notificationSent: false,
    });
  } catch (error) {
    if (transaction) await rollbackFoodDemoTransaction(transaction);
    if (error instanceof SyntaxError || (error instanceof FoodDemoReservationError && error.code === 'VALIDATION')) {
      return json(400, { error: 'Dados de reserva inválidos ou mesa indisponível.' });
    }
    if (error instanceof FoodWorkerAuthError) return json(401, { error: 'Sessão não autenticada.' });
    if (error instanceof FoodTenantAccessError) return json(error.code === 'NOT_FOUND' ? 404 : error.code === 'UNAUTHORIZED' ? 401 : 403, { error: 'Sem acesso ao estabelecimento.' });
    if (error instanceof FoodFirestoreConflict || error instanceof FoodDemoReservationError) {
      return json(409, { error: 'Horário ou chave já utilizados; selecione outro horário ou repita com mesmo ID.' });
    }
    return json(503, { error: 'Reserva demonstrativa temporariamente indisponível.' });
  }
}
