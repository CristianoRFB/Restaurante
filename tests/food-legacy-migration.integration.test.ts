import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { newFoodLead, newFoodDemoTenant } from '@/shared/food-platform-domain';
import { applyFoodLegacyMigration, planFoodLegacyMigration, rollbackFoodLegacyMigration } from '@/shared/food-legacy-migration';

let env: RulesTestEnvironment;
const time = '2026-10-27T12:00:00.000Z';
const leadA = newFoodLead('Migração Exemplo Alpha','cadastro_manual','',time);
const leadB = newFoodLead('Migração Exemplo Beta','cadastro_manual','',time);
const A = newFoodDemoTenant(leadA,time), B = newFoodDemoTenant(leadB,time);
const product = {
  id:'prato001',name:'Produto sintético',description:'Teste de migração',
  categoryId:'pratos',priceCents:2400,active:true,
  whatsapp:'NÃO COPIAR',customerName:'NÃO COPIAR',
};
const table = { id:'mesa001',name:'Mesa sintética',areaId:'salao',capacity:4,active:true,state:'OCCUPIED' };

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8180').split(':');
  env = await initializeTestEnvironment({projectId:'demo-food-legacy-migrate-tests',firestore:{host,port:Number(port)}});
});
afterAll(async () => { if(env)await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const store = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(store,'tenants',A.id),A);
    await setDoc(doc(store,'tenants',B.id),B);
    await setDoc(doc(store,'menuItems',product.id),product);
    await setDoc(doc(store,'tables',table.id),table);
  });
});
describe('migração aditiva Food: Emulator end-to-end', () => {
  it('DRY_RUN não escreve, apply preserva origem, remove PII e é idempotente', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const store=ctx.firestore() as unknown as Firestore;
      const plan=await planFoodLegacyMigration(store,A.id);
      expect(plan).toHaveLength(2);
      expect(plan.map(x=>x.status)).toEqual(['CREATE','CREATE']);
      expect((await getDoc(doc(store,'tenants',A.id,'menuItems',product.id))).exists()).toBe(false);
      expect(await applyFoodLegacyMigration(store,A.id)).toEqual({created:2,unchanged:0});
      const target=(await getDoc(doc(store,'tenants',A.id,'menuItems',product.id))).data();
      expect(target).toMatchObject({id:product.id,tenantId:A.id,priceCents:2400});
      expect(target).not.toHaveProperty('whatsapp');
      expect(target).not.toHaveProperty('customerName');
      expect((await getDoc(doc(store,'tenants',A.id,'tables',table.id))).data())
        .toMatchObject({active:false,state:'MAINTENANCE'});
      expect((await getDoc(doc(store,'menuItems',product.id))).data()).toMatchObject(product);
      expect(await applyFoodLegacyMigration(store,A.id)).toEqual({created:0,unchanged:2});
      expect((await planFoodLegacyMigration(store,A.id)).map(x=>x.status)).toEqual(['ALREADY_APPLIED','ALREADY_APPLIED']);
    });
  });
  it('rollback apaga somente registros migrados e preserva outro tenant', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const store=ctx.firestore() as unknown as Firestore;
      await applyFoodLegacyMigration(store,A.id);
      await applyFoodLegacyMigration(store,B.id);
      expect(await rollbackFoodLegacyMigration(store,A.id)).toBe(2);
      expect((await getDoc(doc(store,'tenants',A.id,'menuItems',product.id))).exists()).toBe(false);
      expect((await getDoc(doc(store,'tenants',B.id,'menuItems',product.id))).exists()).toBe(true);
      expect((await getDoc(doc(store,'menuItems',product.id))).exists()).toBe(true);
      expect(await rollbackFoodLegacyMigration(store,A.id)).toBe(0);
    });
  });
  it('conflito preexistente bloqueia escrita parcial', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const store=ctx.firestore() as unknown as Firestore;
      await setDoc(doc(store,'tenants',A.id,'menuItems',product.id),{id:product.id,tenantId:A.id,name:'INTACTO'});
      await expect(applyFoodLegacyMigration(store,A.id)).rejects.toThrow('Preflight');
      expect((await getDoc(doc(store,'tenants',A.id,'menuItems',product.id))).data()?.name).toBe('INTACTO');
      expect((await getDoc(doc(store,'tenants',A.id,'tables',table.id))).exists()).toBe(false);
    });
  });
  it('rollback interrompido por drift não remove nenhum documento', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const store=ctx.firestore() as unknown as Firestore;
      await applyFoodLegacyMigration(store,A.id);
      await updateDoc(doc(store,'tenants',A.id,'menuItems',product.id),{priceCents:9999});
      await expect(rollbackFoodLegacyMigration(store,A.id)).rejects.toThrow('alterado');
      expect((await getDoc(doc(store,'tenants',A.id,'menuItems',product.id))).exists()).toBe(true);
      expect((await getDoc(doc(store,'tenants',A.id,'tables',table.id))).exists()).toBe(true);
      await expect(applyFoodLegacyMigration(store,A.id)).rejects.toThrow('Preflight');
    });
  });
});
