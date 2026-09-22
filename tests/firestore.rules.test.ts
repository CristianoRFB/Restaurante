import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, runTransaction, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const reservation = { id: 'res-test-1234', code: 'BRU-TEST-1234', date: '2099-09-24', time: '19:30', partySize: 2, customerId: 'guest', customerName: 'Ana Clara', whatsapp: '5545999887766', note: '', status: 'NEW', source: 'SITE', history: [{ id: 'history-1', status: 'NEW', label: 'Reserva criada', createdAt: '2099-09-01T12:00:00.000Z', by: 'Site' }], createdAt: '2099-09-01T12:00:00.000Z', updatedAt: '2099-09-01T12:00:00.000Z', idempotencyKey: 'request-test-1234567890' };

beforeAll(async () => {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '8180'];
  env = await initializeTestEnvironment({ projectId: 'demo-baru-gastronomia', firestore: { host: emulator[0], port: Number(emulator[1]), rules: readFileSync(resolve('firestore.rules'), 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), 'users/admin'), { role: 'ADMIN' }); await setDoc(doc(context.firestore(), 'users/service'), { role: 'SERVICE' }); await setDoc(doc(context.firestore(), 'users/cashier'), { role: 'CASHIER' }); });
});

afterAll(async () => { await env.cleanup(); });

describe('Firestore rules do Baru', () => {
  it('permitem solicitação pública válida, mas não leitura pública', async () => {
    const guest = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(guest, 'reservations/res-test-1234'), reservation));
    await assertFails(getDoc(doc(guest, 'reservations/res-test-1234')));
  });

  it('criam reserva, projeção mínima e idempotência somente em operação coerente', async () => {
    const guest = env.unauthenticatedContext().firestore();
    const transactionReservation = { ...reservation, id: 'res-public-1234', code: 'BRU-PUBLIC-1234', idempotencyKey: 'request-public-123456' };
    const publicReservation = { id: transactionReservation.id, code: transactionReservation.code, date: transactionReservation.date, time: transactionReservation.time, partySize: transactionReservation.partySize, customerName: transactionReservation.customerName, whatsappLast4: '7766', status: transactionReservation.status, createdAt: transactionReservation.createdAt, updatedAt: transactionReservation.updatedAt };
    const request = { idempotencyKey: transactionReservation.idempotencyKey, reservationId: transactionReservation.id, code: transactionReservation.code, createdAt: transactionReservation.createdAt };
    await assertSucceeds(runTransaction(guest, async (transaction) => {
      transaction.set(doc(guest, `reservations/${transactionReservation.id}`), transactionReservation);
      transaction.set(doc(guest, `publicReservations/${transactionReservation.code}`), publicReservation);
      transaction.set(doc(guest, `reservationRequests/${request.idempotencyKey}`), request);
    }));
    await assertSucceeds(getDoc(doc(guest, `publicReservations/${transactionReservation.code}`)));
    await assertSucceeds(getDoc(doc(guest, `reservationRequests/${request.idempotencyKey}`)));
    await assertFails(getDoc(doc(guest, 'publicReservations/OUTRO-CODIGO')));
  });

  it('não permite projeção pública com telefone completo ou status privilegiado', async () => {
    const guest = env.unauthenticatedContext().firestore();
    const forged = { id: 'res-forged-1234', code: 'BRU-FORGED-1234', date: reservation.date, time: reservation.time, partySize: 2, customerName: 'Ana Clara', whatsapp: reservation.whatsapp, status: 'CONFIRMED', createdAt: reservation.createdAt, updatedAt: reservation.updatedAt };
    await assertFails(setDoc(doc(guest, 'publicReservations/BRU-FORGED-1234'), forged));
  });

  it('permitem equipe ler e atualizar, mas bloqueiam exclusão para atendimento', async () => {
    const service = env.authenticatedContext('service').firestore();
    await assertSucceeds(getDoc(doc(service, 'reservations/res-test-1234')));
    await assertSucceeds(updateDoc(doc(service, 'reservations/res-test-1234'), { ...reservation, status: 'CONFIRMED' }));
    await assertFails(deleteDoc(doc(service, 'reservations/res-test-1234')));
  });

  it('permitem admin excluir reserva', async () => {
    const admin = env.authenticatedContext('admin').firestore();
    await assertSucceeds(deleteDoc(doc(admin, 'reservations/res-test-1234')));
  });

  it('isolam perfil de cliente e não permitem que caixa leia equipe', async () => {
    const customer = env.authenticatedContext('customer', { email: 'cliente@example.com' }).firestore();
    const account = { uid: 'customer', email: 'cliente@example.com', name: 'Cliente Real', createdAt: '2099-09-01T12:00:00.000Z', updatedAt: '2099-09-01T12:00:00.000Z' };
    await assertSucceeds(setDoc(doc(customer, 'customerAccounts/customer'), account));
    await assertSucceeds(getDoc(doc(customer, 'customerAccounts/customer')));
    await assertFails(getDoc(doc(customer, 'customerAccounts/outro')));
    const cashier = env.authenticatedContext('cashier').firestore();
    await assertFails(getDoc(doc(cashier, 'users/admin')));
  });
});
