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
    await setDoc(doc(db, `tenants/${demoB.id}/memberships/staffB`), { uid: 'staffB', role: 'MANAGER', active: true });
    await setDoc(doc(db, `tenants/${demoA.id}/menuItems/p001`), product(demoA.id));
    await setDoc(doc(db, `tenants/${demoB.id}/menuItems/p001`), product(demoB.id));
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
  it('suspensão impede operações de staff, mas mantém governança plataforma', async () => {
    const owner = env.authenticatedContext('owner').firestore();
    const a = env.authenticatedContext('staffA').firestore();
    await assertSucceeds(updateDoc(doc(owner, 'tenants', demoA.id), { status: 'SUSPENDED', updatedAt: now }));
    await assertFails(getDoc(doc(a, `tenants/${demoA.id}/menuItems/p001`)));
    await assertSucceeds(getDoc(doc(owner, `tenants/${demoA.id}/menuItems/p001`)));
  });
});
