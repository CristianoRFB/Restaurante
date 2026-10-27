import { describe, expect, it } from 'vitest';
import { newFoodDemoTenant, newFoodLead } from '@/shared/food-platform-domain';
import { bookFoodDemoReservation, type FoodDemoReservation, type FoodDemoReservationLock, type FoodDemoReservationStore, FoodDemoReservationError } from '@/shared/food-demo-reservation';
const now = '2026-10-27T12:00:00.000Z';
const A = newFoodDemoTenant(newFoodLead('Exemplo Mesa A', 'cadastro_manual', '', now), now);
const B = newFoodDemoTenant(newFoodLead('Exemplo Mesa B', 'cadastro_manual', '', now), now);
const payload = { clientRequestId: 'reserve-demo-1234567', tableId: 'mesa01', date: '2026-10-29', time: '19:00', partySize: 3 };
function storeFactory() {
  const reservations = new Map<string, FoodDemoReservation>();
  const locks = new Map<string, FoodDemoReservationLock>();
  const store: FoodDemoReservationStore = {
    tenant: async id => id === A.id ? A : id === B.id ? B : null,
    platformAdmin: async () => null,
    member: async (id, uid) => id === A.id && uid === 'uidA' ? { uid, role: 'MANAGER' as const, active: true } :
      id === B.id && uid === 'uidB' ? { uid, role: 'SERVICE' as const, active: true } : null,
    table: async (id, tableId) => ({ id: tableId, tenantId: id, name: 'Mesa teste', capacity: 4, active: true, state: 'AVAILABLE' }),
    reservation: async (id, key) => reservations.get(id + '/' + key) || null,
    createReservationWithLocks: async (reservation, next) => {
      if (reservations.has(reservation.tenantId + '/' + reservation.id) || next.some(lock => locks.has(lock.tenantId + '/' + lock.id))) {
        throw new FoodDemoReservationError('CONFLICT', 'Slot lock occupied.');
      }
      reservations.set(reservation.tenantId + '/' + reservation.id, reservation);
      for(const lock of next) locks.set(lock.tenantId + '/' + lock.id, lock);
    },
  };
  return { store, reservations, locks };
}
describe('reservas Food DEMO: slots atômicos/tenants', () => {
  it('grava 3 locks de 30 minutos por reserva, sem informação pessoal', async () => {
    const {store,locks}=storeFactory();
    const result=await bookFoodDemoReservation(A.slug,'uidA',payload,store,now);
    expect(result.reservation).toMatchObject({tenantId:A.id, status:'DEMO_RESERVED', paymentRequired:false, notificationSent:false, slotIds:['20261029_1900','20261029_1930','20261029_2000']});
    expect(locks.size).toBe(3);
    expect(Object.hasOwn(result.reservation,'whatsapp')).toBe(false);
  });
  it('replay idempotente e conflito com mesma chave para outra data', async () => {
    const {store,reservations}=storeFactory();
    await bookFoodDemoReservation(A.slug,'uidA',payload,store,now);
    const again=await bookFoodDemoReservation(A.slug,'uidA',payload,store,now);
    expect(again.created).toBe(false);
    await expect(bookFoodDemoReservation(A.slug,'uidA',{...payload,date:'2026-10-30'},store,now)).rejects.toMatchObject({code:'CONFLICT'});
    expect(reservations.size).toBe(1);
  });
  it('bloqueia sobreposição de mesma mesa, mas permite outras mesas e tenants', async () => {
    const {store,reservations}=storeFactory();
    await bookFoodDemoReservation(A.slug,'uidA',payload,store,now);
    await expect(bookFoodDemoReservation(A.slug,'uidA',{...payload,clientRequestId:'reserve-demo-7654321',time:'19:30'},store,now)).rejects.toMatchObject({code:'CONFLICT'});
    await bookFoodDemoReservation(A.slug,'uidA',{...payload,clientRequestId:'reserve-demo-2222222',tableId:'mesa02'},store,now);
    await bookFoodDemoReservation(B.slug,'uidB',payload,store,now);
    expect(reservations.size).toBe(3);
    await expect(bookFoodDemoReservation(B.slug,'uidA',payload,store,now)).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('rejeita mesa cross-tenant, lotação excedida, manutenção e suspensão', async () => {
    const {store}=storeFactory();
    store.table=async (_id,tableId) => ({id:tableId,tenantId:B.id,name:'Mesa B',capacity:4,active:true,state:'AVAILABLE'});
    await expect(bookFoodDemoReservation(A.slug,'uidA',payload,store,now)).rejects.toMatchObject({code:'VALIDATION'});
    store.table=async (id,tableId) => ({id:tableId,tenantId:id,name:'Mesa',capacity:2,active:true,state:'AVAILABLE'});
    await expect(bookFoodDemoReservation(A.slug,'uidA',payload,store,now)).rejects.toMatchObject({code:'VALIDATION'});
    store.tenant=async id => id===A.id?{...A,status:'SUSPENDED'}:B;
    await expect(bookFoodDemoReservation(A.slug,'uidA',payload,store,now)).rejects.toMatchObject({code:'FORBIDDEN'});
  });
  it('valida data real, janela de 90 dias e slots de meia hora', async () => {
    const {store}=storeFactory();
    for(const bad of [{date:'2026-02-30'}, {time:'19:15'}, {date:'2026-10-26'}, {date:'2027-03-01'}, {time:'23:00'}]) {
      await expect(bookFoodDemoReservation(A.slug,'uidA',{...payload,...bad},store,now)).rejects.toMatchObject({code:'VALIDATION'});
    }
  });
  it('concorrência preserva apenas um conjunto de locks', async () => {
    const {store,reservations,locks}=storeFactory();
    const [x,y]=await Promise.allSettled([
      bookFoodDemoReservation(A.slug,'uidA',payload,store,now),
      bookFoodDemoReservation(A.slug,'uidA',{...payload,clientRequestId:'reserve-demo-9876543'},store,now),
    ]);
    expect([x,y].filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(reservations.size).toBe(1); expect(locks.size).toBe(3);
  });
});
