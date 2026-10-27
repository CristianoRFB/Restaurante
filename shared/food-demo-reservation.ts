import { z } from 'zod';
import { FoodTenantAccessError, resolveTrustedFoodWorkerContext, type FoodTenantWorkerLookup } from '@/shared/food-worker-tenant';

export const foodDemoReservationSchema = z.object({
  clientRequestId: z.string().regex(/^[a-zA-Z0-9_-]{16,80}$/),
  tableId: z.string().regex(/^[a-zA-Z0-9_-]{3,100}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
  partySize: z.number().int().min(1).max(20),
}).strict();

export type FoodDemoReservationInput = z.infer<typeof foodDemoReservationSchema>;
export interface FoodDemoTable {
  id: string; tenantId: string; name: string; capacity: number;
  active: boolean; state: 'AVAILABLE' | 'MAINTENANCE';
}
export interface FoodDemoReservation {
  id: string; tenantId: string; customerUid: string; tableId: string;
  date: string; time: string; partySize: number; durationMinutes: 90;
  slotIds: string[]; requestFingerprint: string;
  status: 'DEMO_RESERVED'; demoOnly: true; paymentRequired: false;
  notificationSent: false; createdAt: string;
}
export interface FoodDemoReservationLock {
  id: string; tenantId: string; tableId: string; reservationId: string;
  date: string; startTime: string; demoOnly: true;
}
export class FoodDemoReservationError extends Error {
  constructor(public readonly code: 'VALIDATION' | 'CONFLICT', message: string) { super(message); this.name = 'FoodDemoReservationError'; }
}
export interface FoodDemoReservationStore extends FoodTenantWorkerLookup {
  table: (tenantId: string, tableId: string) => Promise<FoodDemoTable | null>;
  reservation: (tenantId: string, requestId: string) => Promise<FoodDemoReservation | null>;
  createReservationWithLocks: (record: FoodDemoReservation, locks: FoodDemoReservationLock[]) => Promise<void>;
}

function validateDateAndTime(date: string, time: string, now: string): string[] {
  const startDay = Date.parse(date + 'T00:00:00.000Z');
  if (!Number.isFinite(startDay) || new Date(startDay).toISOString().slice(0, 10) !== date) {
    throw new FoodDemoReservationError('VALIDATION', 'Data inválida.');
  }
  const [hour, minute] = time.split(':').map(Number);
  const firstMinute = hour * 60 + minute;
  if (firstMinute < 10 * 60 || firstMinute > 21 * 60 + 30) {
    throw new FoodDemoReservationError('VALIDATION', 'Horário demo permitido de 10:00 até 21:30.');
  }
  const timeUtc = startDay + firstMinute * 60_000;
  const nowUtc = Date.parse(now);
  if (!Number.isFinite(nowUtc) || timeUtc <= nowUtc || timeUtc > nowUtc + 90 * 86400_000) {
    throw new FoodDemoReservationError('VALIDATION', 'Reservas demo exigem data futura em até 90 dias.');
  }
  // Three half-hour slots lock the table for 90 minutes, including overlap.
  return [0, 30, 60].map(offset => {
    const minutes = firstMinute + offset;
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return date.replace(/-/g, '') + '_' + hh + mm;
  });
}
async function fingerprint(tenantId: string, uid: string, input: FoodDemoReservationInput): Promise<string> {
  const json = JSON.stringify({ tenantId, uid, ...input });
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
export async function bookFoodDemoReservation(
  slug: string, uid: string, unsafe: unknown, store: FoodDemoReservationStore,
  now = new Date().toISOString(),
): Promise<{ created: boolean; reservation: FoodDemoReservation }> {
  const parsed = foodDemoReservationSchema.safeParse(unsafe);
  if (!parsed.success) throw new FoodDemoReservationError('VALIDATION', 'Dados de reserva inválidos.');
  const input = parsed.data;
  const slots = validateDateAndTime(input.date, input.time, now);
  const context = await resolveTrustedFoodWorkerContext(slug, uid, store);
  if (context.status !== 'DEMO') throw new FoodTenantAccessError('FORBIDDEN', 'Demonstração suspensa.');
  const hash = await fingerprint(context.tenantId, uid, input);
  const old = await store.reservation(context.tenantId, input.clientRequestId);
  if (old) {
    if (old.tenantId !== context.tenantId || old.customerUid !== uid || old.requestFingerprint !== hash || old.demoOnly !== true) {
      throw new FoodDemoReservationError('CONFLICT', 'Chave de idempotência já utilizada.');
    }
    return { created: false, reservation: old };
  }
  const table = await store.table(context.tenantId, input.tableId);
  if (!table || table.id !== input.tableId || table.tenantId !== context.tenantId || !table.active
    || table.state !== 'AVAILABLE' || !Number.isInteger(table.capacity) || table.capacity < input.partySize) {
    throw new FoodDemoReservationError('VALIDATION', 'Mesa indisponível para este estabelecimento ou grupo.');
  }
  const reservation: FoodDemoReservation = {
    id: input.clientRequestId, tenantId: context.tenantId, customerUid: uid,
    tableId: input.tableId, date: input.date, time: input.time, partySize: input.partySize,
    durationMinutes: 90, slotIds: slots, requestFingerprint: hash,
    status: 'DEMO_RESERVED', demoOnly: true, paymentRequired: false, notificationSent: false,
    createdAt: now,
  };
  const locks = slots.map((slot) => ({
    id: input.tableId + '_' + slot, tenantId: context.tenantId,
    tableId: input.tableId, reservationId: reservation.id,
    date: input.date, startTime: slot, demoOnly: true as const,
  }));
  // Must be a single create-only transaction: reservation AND all slot locks.
  await store.createReservationWithLocks(reservation, locks);
  return { created: true, reservation };
}
