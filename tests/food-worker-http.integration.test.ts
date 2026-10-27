import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { newFoodDemoTenant, newFoodLead } from '@/shared/food-platform-domain';
import { GET as readContext } from '@/app/api/t/[slug]/context/route';
import { POST as createOrder } from '@/app/api/t/[slug]/orders/route';
import { POST as createReservation } from '@/app/api/t/[slug]/reservations/route';

const projectId = 'demo-baru-gastronomia';
const hosts = { firestore: '127.0.0.1:8180', auth: '127.0.0.1:9099' };
const oldEnvironment = Object.fromEntries(['FIREBASE_PROJECT_ID','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST','NEXT_PUBLIC_FIREBASE_API_KEY','FOOD_DEMO_ORDERS_MODE'].map(k=>[k,process.env[k]]));
const time = '2026-10-27T12:00:00.000Z';
const tenantA = newFoodDemoTenant(newFoodLead('Http Fixture A','cadastro_manual','',time),time);
const tenantB = newFoodDemoTenant(newFoodLead('Http Fixture B','cadastro_manual','',time),time);
let env: RulesTestEnvironment;
let uidA = '', uidB = '', uidRevoked = '', tokenA = '', tokenB = '', tokenRevoked = '';
const productA = 'prato-a';
const productB = 'prato-b';
const tableId = 'mesa-abc';
const reserveDate = new Date(Date.now() + 3*86400000).toISOString().slice(0,10);
const requestId = (label: string) => label + '-' + crypto.randomUUID().replaceAll('-','');

async function createAuthFixture(label: string): Promise<{uid:string;token:string}> {
  const url = 'http://'+hosts.auth+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only-test-key';
  const resp = await fetch(url, {
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({email:label+'-'+crypto.randomUUID()+'@example.invalid',password:'Emulator-only-2342',returnSecureToken:true}),
  });
  if(!resp.ok) throw new Error('Auth Emulator fixture setup failed: HTTP '+resp.status);
  const data=await resp.json() as {localId?:string;idToken?:string};
  if(!data.localId||!data.idToken)throw new Error('Auth Emulator did not issue test token.');
  return {uid:data.localId,token:data.idToken};
}
function request(method:'GET'|'POST', slug:string, token?:string, data?:unknown): Request {
  return new Request('http://localhost/api/t/'+encodeURIComponent(slug)+'/'+(method==='GET'?'context':'orders'),{
    method,headers:{ ...(token?{authorization:'Bearer '+token}:{}),...(data?{'content-type':'application/json'}:{}) },
    ...(data?{body:JSON.stringify(data)}:{}),
  });
}
function routeContext(slug:string, token?:string){return readContext(request('GET',slug,token),{params:{slug}});}
function routeOrders(slug:string, token:string, data:unknown){return createOrder(request('POST',slug,token,data),{params:{slug}});}
function routeReservations(slug:string,token:string,data:unknown){
  return createReservation(request('POST',slug,token,data),{params:{slug}});
}
beforeAll(async () => {
  process.env.FIREBASE_PROJECT_ID=projectId;
  process.env.FIRESTORE_EMULATOR_HOST=hosts.firestore;
  process.env.FIREBASE_AUTH_EMULATOR_HOST=hosts.auth;
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY='emulator-only-test-key';
  process.env.FOOD_DEMO_ORDERS_MODE='emulator';
  const [host,port]=hosts.firestore.split(':');
  env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port)}});
  [{uid:uidA,token:tokenA},{uid:uidB,token:tokenB},{uid:uidRevoked,token:tokenRevoked}]
    = await Promise.all(['a','b','revoked'].map(createAuthFixture));
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore() as unknown as Firestore;
    await Promise.all([
      setDoc(doc(db,'tenants',tenantA.id),tenantA),
      setDoc(doc(db,'tenants',tenantB.id),tenantB),
      setDoc(doc(db,'tenants',tenantA.id,'memberships',uidA),{uid:uidA,role:'MANAGER',active:true}),
      setDoc(doc(db,'tenants',tenantB.id,'memberships',uidB),{uid:uidB,role:'SERVICE',active:true}),
      setDoc(doc(db,'tenants',tenantA.id,'memberships',uidRevoked),{uid:uidRevoked,role:'MANAGER',active:false}),
      setDoc(doc(db,'tenants',tenantA.id,'menuItems',productA),{id:productA,tenantId:tenantA.id,name:'Produto Fictício A',description:'',categoryId:'pratos',priceCents:2500,active:true}),
      setDoc(doc(db,'tenants',tenantB.id,'menuItems',productB),{id:productB,tenantId:tenantB.id,name:'Produto Fictício B',description:'',categoryId:'pratos',priceCents:9900,active:true}),
      setDoc(doc(db,'tenants',tenantA.id,'tables',tableId),{id:tableId,tenantId:tenantA.id,name:'Mesa Alpha',capacity:4,active:true,state:'AVAILABLE'}),
      setDoc(doc(db,'tenants',tenantB.id,'tables',tableId),{id:tableId,tenantId:tenantB.id,name:'Mesa Beta',capacity:4,active:true,state:'AVAILABLE'}),
    ]);
  });
},90000);
afterAll(async () => {
  if(env) await env.cleanup();
  for(const [key,value] of Object.entries(oldEnvironment)){
    if(value===undefined) delete process.env[key]; else process.env[key]=value;
  }
});
describe('Food HTTP routes against real Auth + Firestore Emulators', () => {
  it('validates Firebase ID token, membership and tenant A×B in context route',async()=>{
    const success=await routeContext(tenantA.id,tokenA);
    expect(success.status).toBe(200);
    expect(await success.json()).toMatchObject({tenantId:tenantA.id,permissions:{canManageCatalog:true}});
    expect((await routeContext(tenantA.id)).status).toBe(401);
    expect((await routeContext(tenantB.id,tokenA)).status).toBe(403);
    expect((await routeContext(tenantA.id,tokenRevoked)).status).toBe(403);
    expect((await routeContext('bad/tenant',tokenA)).status).toBe(404);
  },60000);

  it('creates priced demo orders only in owned tenant, replays idempotently and rejects forged payload',async()=>{
    const id=requestId('demo-order');
    const data={clientRequestId:id,items:[{productId:productA,quantity:2}]};
    const first=await routeOrders(tenantA.id,tokenA,data);
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({id,tenantId:tenantA.id,subtotalCents:5000,demoOnly:true,created:true});
    const replay=await routeOrders(tenantA.id,tokenA,data);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({id,created:false,subtotalCents:5000});
    expect((await routeOrders(tenantB.id,tokenA,data)).status).toBe(403);
    expect((await routeOrders(tenantA.id,tokenA,{...data,totalCents:1})).status).toBe(400);
    expect((await routeOrders(tenantA.id,tokenA,{...data,tenantId:tenantB.id})).status).toBe(400);
    const other=await routeOrders(tenantB.id,tokenB,{clientRequestId:requestId('demo-order'),items:[{productId:productB,quantity:1}]});
    expect(other.status).toBe(201);
    expect(await other.json()).toMatchObject({tenantId:tenantB.id,subtotalCents:9900});
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore() as unknown as Firestore;
      const saved=(await getDoc(doc(db,'tenants',tenantA.id,'orders',id))).data();
      expect(saved).toMatchObject({customerUid:uidA,tenantId:tenantA.id,subtotalCents:5000});
      expect((await getDoc(doc(db,'tenants',tenantB.id,'orders',id))).exists()).toBe(false);
    });
  },90000);

  it('atomically reserves slots, conflicts only in same tenant and blocks suspended tenant',async()=>{
    const id=requestId('demo-reservation');
    const data={clientRequestId:id,tableId,date:reserveDate,time:'19:00',partySize:2};
    const first=await routeReservations(tenantA.id,tokenA,data);
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({tenantId:tenantA.id,created:true,demoOnly:true});
    const repeated=await routeReservations(tenantA.id,tokenA,data);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toMatchObject({created:false,id});
    const collision=await routeReservations(tenantA.id,tokenA,{...data,clientRequestId:requestId('demo-reservation'),time:'19:30'});
    expect(collision.status).toBe(409);
    expect((await routeReservations(tenantB.id,tokenA,data)).status).toBe(403);
    expect((await routeReservations(tenantB.id,tokenB,data)).status).toBe(201);
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.firestore() as unknown as Firestore;
      await updateDoc(doc(db,'tenants',tenantA.id),{status:'SUSPENDED'});
    });
    expect((await routeOrders(tenantA.id,tokenA,{clientRequestId:requestId('demo-order'),items:[{productId:productA,quantity:1}]})).status).toBe(403);
  },90000);
});
