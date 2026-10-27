import { describe, expect, it } from 'vitest';
import { canViewFoodDemoFinance, summarizeFoodDemoFinance } from '@/shared/food-demo-finance';
import type { FoodDemoOrder } from '@/shared/food-demo-order';
import type { FoodTenantContext } from '@/shared/food-tenant-domain';

const tenant='demo-alpha';
const example: FoodDemoOrder = {
  id:'demo-request-1234567890', tenantId:tenant, customerUid:'synthetic',
  requestFingerprint:'0'.repeat(64), status:'DEMO_RECEIVED', demoOnly:true,
  paymentRequired:false, fulfillment:'SIMULATED_PICKUP',
  items:[{productId:'prato001',name:'Produto sintético',priceCents:2199,quantity:2,lineCents:4398}],
  subtotalCents:4398,createdAt:'2026-10-27T12:00:00.000Z',
};
const fakeCtx=(role:'SERVICE'|'CASHIER'|'MANAGER',active=true) =>
 ({isPlatformOwner:false,membership:{uid:'any',role,active}} as FoodTenantContext);
describe('financeiro DEMO: volume fictício sem cobrança',()=>{
  it('soma somente valores íntegros em centavos',()=>{
    expect(summarizeFoodDemoFinance(tenant,[example])).toEqual({
      orderCount:1,itemCount:2,simulatedGrossCents:4398,averageOrderCents:4398,sampleLimited:false,
    });
    expect(summarizeFoodDemoFinance(tenant,[]).simulatedGrossCents).toBe(0);
  });
  it('rejeita tenant alheio, itens adulterados, duplicatas ou transação paga',()=>{
    expect(()=>summarizeFoodDemoFinance('other-tenant',[example])).toThrow();
    expect(()=>summarizeFoodDemoFinance(tenant,[example,example])).toThrow();
    expect(()=>summarizeFoodDemoFinance(tenant,[{...example,paymentRequired:true}])).toThrow();
    expect(()=>summarizeFoodDemoFinance(tenant,[{...example,subtotalCents:1}])).toThrow();
    expect(()=>summarizeFoodDemoFinance(tenant,[{...example,items:[{...example.items[0],lineCents:1}]}])).toThrow();
  });
  it('somente gerência, caixa ou plataforma podem abrir visão',()=>{
    expect(canViewFoodDemoFinance(fakeCtx('CASHIER'))).toBe(true);
    expect(canViewFoodDemoFinance(fakeCtx('MANAGER'))).toBe(true);
    expect(canViewFoodDemoFinance(fakeCtx('SERVICE'))).toBe(false);
    expect(canViewFoodDemoFinance(fakeCtx('CASHIER',false))).toBe(false);
  });
});
