import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const reservation = { id: 'res-test-1234', code: 'BRU-TEST-1234', date: '2099-09-24', time: '19:30', partySize: 2, customerId: 'guest', customerName: 'Ana Clara', whatsapp: '5545999887766', note: '', status: 'NEW', source: 'SITE', history: [], createdAt: '2099-09-01T12:00:00.000Z', updatedAt: '2099-09-01T12:00:00.000Z' };

beforeAll(async () => {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '8180'];
  env = await initializeTestEnvironment({ projectId: 'demo-baru-gastronomia', firestore: { host: emulator[0], port: Number(emulator[1]), rules: readFileSync(resolve('firestore.rules'), 'utf8') } });
  await env.withSecurityRulesDisabled(async (context) => { await setDoc(doc(context.firestore(), 'users/admin'), { role: 'ADMIN' }); await setDoc(doc(context.firestore(), 'users/service'), { role: 'SERVICE' }); });
});

afterAll(async () => { await env.cleanup(); });

describe('Firestore rules do Baru', () => {
  it('permitem solicitação pública válida, mas não leitura pública', async () => {
    const guest = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(guest, 'reservations/public-test'), reservation));
    await assertFails(getDoc(doc(guest, 'reservations/public-test')));
  });

  it('permitem consulta pública somente pela cópia opaca de confirmação', async () => {
    const guest = env.unauthenticatedContext().firestore();
    const publicReservation = { id: reservation.id, code: reservation.code, date: reservation.date, time: reservation.time, partySize: reservation.partySize, customerName: reservation.customerName, whatsapp: reservation.whatsapp, status: reservation.status, createdAt: reservation.createdAt, updatedAt: reservation.updatedAt };
    await assertSucceeds(setDoc(doc(guest, 'publicReservations/BRU-TEST-1234'), publicReservation));
    await assertSucceeds(getDoc(doc(guest, 'publicReservations/BRU-TEST-1234')));
    await assertFails(getDoc(doc(guest, 'publicReservations/OUTRO-CODIGO')));
  });

  it('permitem registrar uma chave idempotente sem expor a reserva operacional', async () => {
    const guest = env.unauthenticatedContext().firestore();
    const request = { idempotencyKey: 'request-test-1234567890', reservationId: reservation.id, code: reservation.code, createdAt: reservation.createdAt };
    await assertSucceeds(setDoc(doc(guest, 'reservationRequests/request-test-1234567890'), request));
    await assertSucceeds(getDoc(doc(guest, 'reservationRequests/request-test-1234567890')));
  });

  it('permitem equipe ler e atualizar, mas bloqueiam exclusão para atendimento', async () => {
    const service = env.authenticatedContext('service').firestore();
    await assertSucceeds(getDoc(doc(service, 'reservations/public-test')));
    await assertSucceeds(updateDoc(doc(service, 'reservations/public-test'), { ...reservation, status: 'CONFIRMED' }));
    await assertFails(deleteDoc(doc(service, 'reservations/public-test')));
  });

  it('permitem admin excluir reserva', async () => {
    const admin = env.authenticatedContext('admin').firestore();
    await assertSucceeds(deleteDoc(doc(admin, 'reservations/public-test')));
  });
});
