import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BARU_LEAD_NAME, BARU_SOURCE_URL, newFoodDemoTenant, newFoodLead } from '../shared/food-platform-domain.ts';

// Emulator ONLY. A non-loopback host or real Firebase project is deliberately rejected.
const host = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-baru-gastronomia';
const ownerUid = process.env.FOOD_PLATFORM_OWNER_UID ?? '';
if (!/^(localhost|127\.0\.0\.1):[0-9]{2,5}$/.test(host) || !/^demo-[a-z0-9-]+$/.test(projectId)) {
  throw new Error('Seed recusado: use FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 e projeto demo-.');
}
if (!/^[a-zA-Z0-9_-]{4,128}$/.test(ownerUid)) {
  throw new Error('Informe FOOD_PLATFORM_OWNER_UID de uma conta previamente criada no Auth Emulator.');
}

const [hostname, port] = host.split(':');
const env = await initializeTestEnvironment({ projectId, firestore: { host: hostname, port: Number(port) } });
const now = new Date().toISOString();
const a = newFoodLead(BARU_LEAD_NAME, 'repositorio_legado', BARU_SOURCE_URL, now);
const b = newFoodLead('Fixture Food B Teste', 'cadastro_manual', '', now); // Never a real lead.
const items = [
  [{ id: 'demo-prato', categoryId: 'refeicoes', name: 'Prato fictício', description: 'Apenas apresentação.', priceCents: 2500, active: true }],
  [{ id: 'demo-lanche', categoryId: 'lanches', name: 'Lanche fictício B', description: 'Apenas apresentação.', priceCents: 1800, active: true }],
];
let created = 0;
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    async function createUnlessExists(path: string, value: Record<string, unknown>) {
      const ref = doc(db, path);
      if ((await getDoc(ref)).exists()) return;
      await setDoc(ref, value);
      created++;
    }
    const ownerRef = doc(db, 'platformAdmins', ownerUid);
    const existingOwner = await getDoc(ownerRef);
    if (existingOwner.exists() && (existingOwner.data().role !== 'platform_owner' || existingOwner.data().active !== true)) {
      throw new Error('Conflito de UID: não alterar privilégios existentes.');
    }
    await createUnlessExists('platformAdmins/' + ownerUid, { role: 'platform_owner', active: true });
    for (const [index, lead] of [a, b].entries()) {
      const tenant = newFoodDemoTenant(lead, now);
      await createUnlessExists('platformLeads/' + lead.id, { ...lead, demoTenantId: tenant.id });
      const tenantRef = doc(db, 'tenants', tenant.id);
      const existingTenant = await getDoc(tenantRef);
      if (existingTenant.exists() && existingTenant.data().linkedLeadId !== lead.id) throw new Error('Tenant conflitante, não sobrescrever.');
      await createUnlessExists('tenants/' + tenant.id, { ...tenant });
      for (const item of items[index]) {
        await createUnlessExists('tenants/' + tenant.id + '/menuItems/' + item.id, { ...item, tenantId: tenant.id });
      }
    }
  });
  process.stdout.write('Seed local concluído: ' + created + ' documentos criados; pré-existentes preservados.\n');
} finally {
  await env.cleanup();
}
