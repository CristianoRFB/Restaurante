import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { newFoodDemoTenant, newFoodLead } from '@/shared/food-platform-domain';

let env: RulesTestEnvironment;
const now = '2026-10-27T12:00:00.000Z';
const lead = newFoodLead('Baru Gastronomia', 'repositorio_legado', 'https://github.com/CristianoRFB/Restaurante', now);
const demoA = newFoodDemoTenant(lead, now);
const leadB = newFoodLead('Exemplo Lanchonete', 'cadastro_manual', '', now);
const demoB = newFoodDemoTenant(leadB, now);
const product = (tenantId: string) => ({ id: 'p001', tenantId, name: 'Produto demo', description: 'Somente dados sintéticos', categoryId: 'c001', priceCents: 2000, active: true });

beforeAll(async () => {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST?.split(':') ?? ['127.0.0.1', '8180'];
  env = await initializeTestEnvironment({ projectId: 'demo-food-platform-core', firestore: { host: emulator[0], port: Number(emulator[1]), rules: readFileSync(resolve('firestore.rules'), 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'platformAdmins/owner'), { role: 'platform_owner', active: true });
    await setDoc(doc(db, 'users/legacyadmin'), { role: 'ADMIN' });
    await setDoc(doc(db, 'platformLeads/baru-gastronomia'), { ...lead, demoTenantId: demoA.id });
    await setDoc(doc(db, 'platformLeads/exemplo-lanchonete'), { ...leadB, demoTenantId: demoB.id });
    await setDoc(doc(db, 'tenants', demoA.id), demoA);
    await setDoc(doc(db, 'tenants', demoB.id), demoB);
    await setDoc(doc(db, `tenants/${demoA.id}/memberships/staffA`), { uid: 'staffA', role: 'MANAGER', active: true });
    await setDoc(doc(db, `tenants/${demoA.id}/memberships/ownerA`), { uid: 'ownerA', role: 'tenant_owner', active: true });
    await setDoc(doc(db, `tenants/${demoB.id}/memberships/staffB`), { uid: 'staffB', role: 'MANAGER', active: true });
    await setDoc(doc(db, `tenants/${demoA.id}/menuItems/p001`), product(demoA.id));
    await setDoc(doc(db, `tenants/${demoB.id}/menuItems/p001`), product(demoB.id));
    await setDoc(doc(db, `tenants/${demoA.id}/tables/mesa001`), { id:'mesa001', tenantId:demoA.id, name:'Mesa 1', capacity:4, active:true, state:'AVAILABLE' });
    await setDoc(doc(db, `tenants/${demoB.id}/tables/mesa001`), { id:'mesa001', tenantId:demoB.id, name:'Mesa B', capacity:4, active:true, state:'AVAILABLE' });
  });
});
afterAll(async () => { await env.cleanup(); });

describe('Food Platform: Rules tenant-aware (aditivas ao legado)', () => {
  it('nega leitura de leads e criação de admin plataforma por cliente, anônimo e ADMIN legado', async () => {
    const guest = env.unauthenticatedContext().firestore();
    const staff = env.authenticatedContext('staffA').firestore();
    const legacyAdmin = env.authenticatedContext('legacyadmin').firestore();
    await assertFails(getDoc(doc(guest, 'platformLeads/baru-gastronomia')));
    await assertFails(getDoc(doc(staff, 'platformLeads/baru-gastronomia')));
    await assertFails(setDoc(doc(legacyAdmin, 'platformLeads/outro'), lead));
    await assertFails(setDoc(doc(legacyAdmin, 'platformAdmins/legacyadmin'), { role: 'platform_owner', active: true }));
    await assertFails(setDoc(doc(staff, 'platformAdmins/staffA'), { role: 'platform_owner', active: true }));
  });
  it('permite que Platform Owner leia lead e crie apenas demo, jamais cliente pago', async () => {
    const owner = env.authenticatedContext('owner').firestore();
    await assertSucceeds(getDoc(doc(owner, 'platformLeads/baru-gastronomia')));
    const thirdLead = newFoodLead('Restaurante Terceiro', 'cadastro_manual', '', now);
    const thirdDemo = newFoodDemoTenant(thirdLead, now);
    await assertSucceeds(setDoc(doc(owner, 'platformLeads', thirdLead.id), thirdLead));
    await assertSucceeds(setDoc(doc(owner, 'tenants', thirdDemo.id), thirdDemo));
    await assertFails(setDoc(doc(owner, 'tenants/cliente-pago'), { ...demoA, id: 'cliente-pago', slug: 'cliente-pago', subscriptionStatus: 'active' }));
    await assertFails(setDoc(doc(owner, 'platformLeads/pago'), { ...lead, id: 'pago', status: 'CONVERTIDO' }));
  });
  it('isola A x B para leitura, listagem e escrita mesmo conhecendo o ID da vítima', async () => {
    const a = env.authenticatedContext('staffA').firestore();
    const b = env.authenticatedContext('staffB').firestore();
    await assertSucceeds(getDoc(doc(a, `tenants/${demoA.id}/menuItems/p001`)));
    await assertFails(getDoc(doc(a, `tenants/${demoB.id}/menuItems/p001`)));
    await assertFails(getDocs(collection(a, `tenants/${demoB.id}/menuItems`)));
    await assertFails(setDoc(doc(a, `tenants/${demoB.id}/menuItems/p999`), { ...product(demoB.id), id: 'p999' }));
    await assertSucceeds(getDoc(doc(b, `tenants/${demoB.id}/menuItems/p001`)));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `tenants/${demoA.id}/menuItems/p001`)));
  });
  it('bloqueia spoof tenantId e escalada por membership próprio', async () => {
    const a = env.authenticatedContext('staffA').firestore();
    await assertFails(setDoc(doc(a, `tenants/${demoA.id}/menuItems/forged`), { ...product(demoB.id), id: 'forged' }));
    await assertFails(setDoc(doc(a, `tenants/${demoA.id}/memberships/staffA`), { uid: 'staffA', role: 'tenant_owner', active: true }));
    await assertFails(setDoc(doc(a, `tenants/${demoA.id}/orders/fake`), { id: 'fake' }));
  });
  it('permite tenant_owner gerir membros operacionais em A, mas não escalar para ADMIN ou tenant_owner nem tocar B', async () => {
    const ownerA = env.authenticatedContext('ownerA').firestore();
    const staffA = env.authenticatedContext('staffA').firestore();
    await assertSucceeds(getDocs(collection(ownerA, `tenants/${demoA.id}/memberships`)));
    await assertFails(getDocs(collection(ownerA, `tenants/${demoB.id}/memberships`)));
    await assertFails(getDocs(collection(staffA, `tenants/${demoA.id}/memberships`)));
    await assertSucceeds(setDoc(doc(ownerA, `tenants/${demoA.id}/memberships/memberX`), { uid: 'memberX', role: 'SERVICE', active: true }));
    await assertSucceeds(updateDoc(doc(ownerA, `tenants/${demoA.id}/memberships/memberX`), { active: false }));
    await assertFails(setDoc(doc(ownerA, `tenants/${demoA.id}/memberships/adminX`), { uid: 'adminX', role: 'ADMIN', active: true }));
    await assertFails(setDoc(doc(ownerA, `tenants/${demoA.id}/memberships/ownerX`), { uid: 'ownerX', role: 'tenant_owner', active: true }));
    await assertFails(setDoc(doc(ownerA, `tenants/${demoB.id}/memberships/crossX`), { uid: 'crossX', role: 'SERVICE', active: true }));
    await assertFails(updateDoc(doc(ownerA, `tenants/${demoA.id}/memberships/ownerA`), { active: false }));
  });
  it('CRUD de catálogo autentica por tenant e papel: gestor A opera A, B não invade, service não modifica', async () => {
    const ownerA = env.authenticatedContext('ownerA').firestore();
    const service = env.authenticatedContext('other').firestore();
    const staffB = env.authenticatedContext('staffB').firestore();
    const record = { ...product(demoA.id), id: 'p-two' };
    await assertSucceeds(setDoc(doc(ownerA, `tenants/${demoA.id}/menuItems/p-two`), record));
    await assertSucceeds(updateDoc(doc(ownerA, `tenants/${demoA.id}/menuItems/p-two`), { priceCents: 3090 }));
    await assertFails(updateDoc(doc(staffB, `tenants/${demoA.id}/menuItems/p-two`), { priceCents: 1 }));
    await assertFails(setDoc(doc(service, `tenants/${demoA.id}/menuItems/p-other`), { ...record, id: 'p-other' }));
    await assertFails(setDoc(doc(ownerA, `tenants/${demoA.id}/menuItems/p-forged`), { ...record, id: 'p-forged', tenantId: demoB.id }));
  });
  it('mesas A/B: isola leitura e CRUD, impede manipular reservas/locks pelo SDK', async () => {
    const a = env.authenticatedContext('staffA').firestore();
    const b = env.authenticatedContext('staffB').firestore();
    const guest = env.unauthenticatedContext().firestore();
    const table = { id:'mesa002',tenantId:demoA.id,name:'Mesa 2',capacity:6,active:true,state:'AVAILABLE' };
    await assertSucceeds(getDoc(doc(a,`tenants/${demoA.id}/tables/mesa001`)));
    await assertFails(getDoc(doc(a,`tenants/${demoB.id}/tables/mesa001`)));
    await assertFails(getDocs(collection(b,`tenants/${demoA.id}/tables`)));
    await assertFails(getDoc(doc(guest,`tenants/${demoA.id}/tables/mesa001`)));
    await assertSucceeds(setDoc(doc(a,`tenants/${demoA.id}/tables/mesa002`),table));
    await assertFails(setDoc(doc(a,`tenants/${demoB.id}/tables/mesa002`),{...table,tenantId:demoB.id}));
    await assertFails(setDoc(doc(a,`tenants/${demoA.id}/tables/mesa003`),{...table,id:'mesa003',tenantId:demoB.id}));
    await assertFails(setDoc(doc(a,`tenants/${demoA.id}/reservations/abc`),{id:'abc'}));
    await assertFails(setDoc(doc(a,`tenants/${demoA.id}/reservationLocks/abc`),{id:'abc'}));
  });
  it('suspensão impede operações de staff, mas mantém governança plataforma', async () => {
    const owner = env.authenticatedContext('owner').firestore();
    const a = env.authenticatedContext('staffA').firestore();
    await assertSucceeds(updateDoc(doc(owner, 'tenants', demoA.id), { status: 'SUSPENDED', updatedAt: now }));
    await assertFails(getDoc(doc(a, `tenants/${demoA.id}/menuItems/p001`)));
    await assertSucceeds(getDoc(doc(owner, `tenants/${demoA.id}/menuItems/p001`)));
  });
});
