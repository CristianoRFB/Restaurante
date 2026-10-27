import { describe, expect, it } from 'vitest';
import { assertFoodMigrationEnvironment, projectFoodLegacyDocument } from '@/shared/food-legacy-migration';

describe('Food legacy migration: strict projections and environment gate', () => {
  const tenant = 'baru-gastronomia-demo';
  it('does not leak personal information, commercial identity or legacy operational fields', () => {
    expect(projectFoodLegacyDocument('menuItems','prato001',{
      name: ' Prato fictício ', description: 'Demo', categoryId: 'refeicoes',
      priceCents: 2500, active: true, whatsapp: '11999999999', customerName: 'PRIVATE',
      imageUrl: 'https://example.com/personal.jpg', tenantId: 'wrong-tenant',
    }, tenant)).toEqual({ id:'prato001',tenantId:tenant,name:'Prato fictício',description:'Demo',categoryId:'refeicoes',priceCents:2500,active:true });
  });
  it('maps OCCUPIED/RESERVED to unavailable demo table', () => {
    expect(projectFoodLegacyDocument('tables','mesa001',{ name:'Mesa',capacity:4,active:true,state:'OCCUPIED' },tenant))
      .toEqual({id:'mesa001',tenantId:tenant,name:'Mesa',capacity:4,active:false,state:'MAINTENANCE'});
  });
  it('rejects invalid ids, prices and source schemas', () => {
    expect(() => projectFoodLegacyDocument('tables','../evil',{name:'Mesa',capacity:4,active:true,state:'AVAILABLE'},tenant)).toThrow();
    expect(() => projectFoodLegacyDocument('menuItems','prato001',{name:'Prato',description:'',categoryId:'x',priceCents:NaN,active:true},tenant)).toThrow();
    expect(() => projectFoodLegacyDocument('tables','mesa001',{name:'Mesa',capacity:0,active:true,state:'AVAILABLE'},tenant)).toThrow();
  });
  it('hard-denies remote Firebase hosts, non-demo projects and non-demo tenant targets', () => {
    const okay = { host:'127.0.0.1:8180',projectId:'demo-food-migrate',tenantId:tenant };
    expect(() => assertFoodMigrationEnvironment(okay)).not.toThrow();
    expect(() => assertFoodMigrationEnvironment({...okay,host:'firestore.googleapis.com:443'})).toThrow();
    expect(() => assertFoodMigrationEnvironment({...okay,projectId:'restaurante-5665d'})).toThrow();
    expect(() => assertFoodMigrationEnvironment({...okay,tenantId:'real-client'})).toThrow();
  });
});
