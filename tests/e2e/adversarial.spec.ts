import { expect, test } from '@playwright/test';

test('endpoint público rejeita campos privilegiados antes de tocar o Firebase', async ({ request }) => {
  const response = await request.post('/api/reservations', { data: { date: '2099-09-24', time: '19:30', partySize: 2, customerName: 'Ana Clara', whatsapp: '5545999887766', note: '', status: 'CONFIRMED' } });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ error: 'Payload de reserva inválido.' });
});

test('reserva pública não anuncia sucesso quando a capacidade operacional não está cadastrada', async ({ request }) => {
  const response = await request.post('/api/reservations', { data: { date: '2099-09-24', time: '19:30', partySize: 2, customerName: 'Ana Clara', whatsapp: '5545999887766', note: '', idempotencyKey: `e2e-${Date.now()}-request` } });
  expect([409, 503]).toContain(response.status());
  await expect(response.json()).resolves.toHaveProperty('error');
});

test('schema público rejeita tipos incorretos e JSON malformado', async ({ request }) => {
  const wrongType = await request.post('/api/reservations', { data: { date: '2099-09-24', time: '19:30', partySize: '2', customerName: 'Ana Clara', whatsapp: '5545999887766', note: '', idempotencyKey: `e2e-${Date.now()}-wrong` } });
  expect(wrongType.status()).toBe(400);
  const malformed = await request.post('/api/reservations', { headers: { 'content-type': 'application/json' }, data: '{"date":' });
  expect(malformed.status()).toBe(400);
});
