import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import {
  beginFoodDemoTransaction, createFoodTxOrder, createFoodTxDocuments, foodDemoOrdersEnabled,
  getFoodTxDocument, rollbackFoodDemoTransaction, FoodFirestoreConflict,
} from '@/lib/food-worker-demo-transaction';
import type { FoodDemoOrder } from '@/shared/food-demo-order';

const saved = {
  mode: process.env.FOOD_DEMO_ORDERS_MODE,
  host: process.env.FIRESTORE_EMULATOR_HOST,
  project: process.env.FIREBASE_PROJECT_ID,
};
beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Firestore Emulator obrigatório para teste REST.');
  process.env.FOOD_DEMO_ORDERS_MODE = 'emulator';
  process.env.FIREBASE_PROJECT_ID = 'demo-food-checkout-transaction';
});
afterAll(() => {
  for (const [key, value] of Object.entries({
    FOOD_DEMO_ORDERS_MODE: saved.mode,
    FIRESTORE_EMULATOR_HOST: saved.host,
    FIREBASE_PROJECT_ID: saved.project,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
function order(id: string): FoodDemoOrder {
  return {
    id, tenantId: 'restaurante-demo', customerUid: 'synthetic-uid',
    requestFingerprint: 'a'.repeat(64), status: 'DEMO_RECEIVED',
    demoOnly: true, paymentRequired: false, fulfillment: 'SIMULATED_PICKUP',
    items: [{ productId: 'prato001', name: 'Produto de teste', quantity: 2, priceCents: 1599, lineCents: 3198 }],
    subtotalCents: 3198, createdAt: '2026-10-27T12:00:00.000Z',
  };
}
describe('Firestore Emulator — transação REST de pedido multi-tenant', () => {
  it('nega modo de produção e exige emulator local', () => {
    expect(foodDemoOrdersEnabled()).toBe(true);
    const current = process.env.FIRESTORE_EMULATOR_HOST;
    process.env.FIRESTORE_EMULATOR_HOST = 'firestore.googleapis.com:443';
    expect(foodDemoOrdersEnabled()).toBe(false);
    process.env.FIRESTORE_EMULATOR_HOST = current;
  });
  it('salva documento completo, lê novamente e aplica precondição de criação única', async () => {
    const id = 'demoorder_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    console.info('demo-tx: starting first transaction');
    const first = await beginFoodDemoTransaction();
    console.info('demo-tx: first transaction started');
    expect(await getFoodTxDocument(['tenants', 'restaurante-demo', 'orders', id], first)).toBeNull();
    console.info('demo-tx: committing order');
    await createFoodTxOrder(order(id), first);
    console.info('demo-tx: order committed');

    console.info('demo-tx: opening read transaction');
    const read = await beginFoodDemoTransaction();
    console.info('demo-tx: reading committed order');
    const saved = await getFoodTxDocument(['tenants', 'restaurante-demo', 'orders', id], read);
    expect(saved).toMatchObject({ id, tenantId: 'restaurante-demo', subtotalCents: 3198, demoOnly: true, paymentRequired: false });
    await rollbackFoodDemoTransaction(read);

    console.info('demo-tx: opening conflict transaction');
    const second = await beginFoodDemoTransaction();
    await expect(createFoodTxOrder(order(id), second)).rejects.toBeInstanceOf(FoodFirestoreConflict);
    await rollbackFoodDemoTransaction(second);
  });
  it('cria reserva e 3 bloqueios atomicamente; colisão não deixa reserva órfã', async () => {
    const stamp = crypto.randomUUID().replace(/-/g, '').slice(0, 15);
    const slotBase = '20261030_';
    const locks = ['1900','1930','2000'].map(t => 'mesa001_' + slotBase + t + '_' + stamp);
    const firstId = 'res_' + stamp + '_1';
    const secondId = 'res_' + stamp + '_2';
    const makeWrites = (tenantId: string, reservationId: string, slotIds: string[]) => [
      { segments: ['tenants',tenantId,'reservations',reservationId], record: {id:reservationId, tenantId,demoOnly:true} },
      ...slotIds.map((id) => ({ segments: ['tenants',tenantId,'reservationLocks',id], record: {id,tenantId,reservationId,demoOnly:true} })),
    ];
    const tx = await beginFoodDemoTransaction();
    await createFoodTxDocuments(makeWrites('food-a-demo',firstId,locks),tx);
    const read = await beginFoodDemoTransaction();
    expect(await getFoodTxDocument(['tenants','food-a-demo','reservations',firstId],read)).toMatchObject({id:firstId,tenantId:'food-a-demo'});
    for(const lock of locks) expect(await getFoodTxDocument(['tenants','food-a-demo','reservationLocks',lock],read)).toMatchObject({reservationId:firstId});
    await rollbackFoodDemoTransaction(read);
    const collision = await beginFoodDemoTransaction();
    await expect(createFoodTxDocuments(makeWrites('food-a-demo',secondId,locks.slice(1).concat('mesa002_'+stamp)),collision)).rejects.toBeInstanceOf(FoodFirestoreConflict);
    await rollbackFoodDemoTransaction(collision);
    const reread = await beginFoodDemoTransaction();
    expect(await getFoodTxDocument(['tenants','food-a-demo','reservations',secondId],reread)).toBeNull();
    await rollbackFoodDemoTransaction(reread);
    const other = await beginFoodDemoTransaction();
    await createFoodTxDocuments(makeWrites('food-b-demo',secondId,locks),other);
    const verifyOther = await beginFoodDemoTransaction();
    expect(await getFoodTxDocument(['tenants','food-b-demo','reservations',secondId],verifyOther)).toMatchObject({id:secondId});
    await rollbackFoodDemoTransaction(verifyOther);
  });

  it('isola documento por tenant e rejeita caminho de travessia', async () => {
    const id = 'demoorder_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const tx = await beginFoodDemoTransaction();
    await createFoodTxOrder(order(id), tx);
    const read = await beginFoodDemoTransaction();
    expect(await getFoodTxDocument(['tenants', 'outro-restaurante', 'orders', id], read)).toBeNull();
    await expect(getFoodTxDocument(['tenants', '../restaurante-demo', 'orders', id], read)).rejects.toThrow();
    await rollbackFoodDemoTransaction(read);
  });
});
