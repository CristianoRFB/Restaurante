import { expect, test, type Page } from '@playwright/test';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import { newFoodDemoTenant, newFoodLead } from '../../../shared/food-platform-domain';

const project = 'demo-baru-gastronomia';
const now = '2026-10-27T12:00:00.000Z';
const tenantA = newFoodDemoTenant(newFoodLead('Food Browser A','cadastro_manual','',now),now);
const tenantB = newFoodDemoTenant(newFoodLead('Food Browser B','cadastro_manual','',now),now);
const prefix = (slug: string) => '/t/' + slug;
type Identity = { email:string; password:string; uid:string };
const users: {a?:Identity;b?:Identity} = {};
let environment: RulesTestEnvironment;

async function authAccount(name: string): Promise<Identity> {
  const email = name + '-' + crypto.randomUUID() + '@example.invalid';
  const password = 'E2E-' + crypto.randomUUID() + '-only';
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-browser-only-key',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({email,password,returnSecureToken:true}),
  });
  if(!response.ok)throw new Error('Auth Emulator did not create synthetic user: HTTP '+response.status);
  const data=await response.json() as {localId?:string};
  if(!data.localId)throw new Error('Auth Emulator returned no UID.');
  return {email,password,uid:data.localId};
}
async function login(page:Page, slug:string, identity:Identity) {
  page.on('pageerror', error=>console.error('BROWSER PAGE ERROR:',error.message));
  page.on('console', message=>{
    if(message.type()==='error')console.error('BROWSER CONSOLE ERROR:',message.text().slice(0,400));
  });
  await page.goto(prefix(slug)+'/login');
  await page.getByRole('textbox',{name:'E-mail'}).fill(identity.email);
  await page.getByLabel('Senha').fill(identity.password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  try {
    await expect(page).toHaveURL(new RegExp('/t/'+slug+'/admin$'),{timeout:12000});
  } catch {
    const alerts=await page.getByRole('alert').allTextContents();
    const statuses=await page.getByRole('status').allTextContents();
    throw new Error('Login did not navigate. Alerts: '+JSON.stringify(alerts).slice(0,600)+' | status: '+JSON.stringify(statuses).slice(0,400));
  }
  await expect(page.getByRole('heading',{name:/^Admin:/})).toBeVisible();
}
test.beforeAll(async()=>{
  test.setTimeout(90000);
  environment=await initializeTestEnvironment({projectId:project,firestore:{host:'127.0.0.1',port:8180}});
  [users.a,users.b]=await Promise.all([authAccount('food-a'),authAccount('food-b')]);
  await environment.withSecurityRulesDisabled(async context=>{
    const db=context.firestore() as unknown as Firestore;
    await Promise.all([
      setDoc(doc(db,'platformLeads',tenantA.linkedLeadId),{...newFoodLead('Food Browser A','cadastro_manual','',now),demoTenantId:tenantA.id}),
      setDoc(doc(db,'platformLeads',tenantB.linkedLeadId),{...newFoodLead('Food Browser B','cadastro_manual','',now),demoTenantId:tenantB.id}),
      setDoc(doc(db,'tenants',tenantA.id),tenantA),
      setDoc(doc(db,'tenants',tenantB.id),tenantB),
      setDoc(doc(db,'tenants',tenantA.id,'memberships',users.a!.uid),{uid:users.a!.uid,role:'tenant_owner',active:true}),
      setDoc(doc(db,'tenants',tenantB.id,'memberships',users.b!.uid),{uid:users.b!.uid,role:'tenant_owner',active:true}),
      setDoc(doc(db,'tenants',tenantA.id,'menuItems','prato001'),{id:'prato001',tenantId:tenantA.id,name:'Item fictício A',description:'Produto exclusivo A',categoryId:'pratos',priceCents:2590,active:true}),
      setDoc(doc(db,'tenants',tenantB.id,'menuItems','prato001'),{id:'prato001',tenantId:tenantB.id,name:'Item fictício B',description:'Produto exclusivo B',categoryId:'pratos',priceCents:7990,active:true}),
      setDoc(doc(db,'tenants',tenantA.id,'tables','mesa001'),{id:'mesa001',tenantId:tenantA.id,name:'Mesa A',capacity:4,active:true,state:'AVAILABLE'}),
      setDoc(doc(db,'tenants',tenantB.id,'tables','mesa001'),{id:'mesa001',tenantId:tenantB.id,name:'Mesa B',capacity:4,active:true,state:'AVAILABLE'}),
    ]);
  });
});
test.afterAll(async()=>{if(environment)await environment.cleanup();});

test('A: login, preview, edição de marca e tela adaptável em mobile',async({page})=>{
  await login(page,tenantA.id,users.a!);
  await page.goto(prefix(tenantA.id));
  await expect(page.getByRole('heading',{name:tenantA.branding.name})).toBeVisible();
  await expect(page.getByText('Item fictício A')).toBeVisible();
  await expect(page.getByText('Item fictício B')).toHaveCount(0);
  await page.goto(prefix(tenantA.id)+'/branding');
  await expect(page.getByRole('heading',{name:'Identidade visual do tenant'})).toBeVisible();
  await page.getByLabel('Nome da demo').fill('Marca Fictícia A — Teste');
  await page.getByRole('button',{name:'Salvar identidade DEMO'}).click();
  await expect(page.getByRole('status')).toContainText('Identidade interna salva');
  await page.goto(prefix(tenantA.id));
  await expect(page.getByRole('heading',{name:'Marca Fictícia A — Teste'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.goto(prefix(tenantA.id));
  await expect(page.getByText('Item fictício A')).toBeVisible();
});

test('B: acesso negado ao tenant A, cardápio e marca estritamente próprios',async({page})=>{
  await login(page,tenantB.id,users.b!);
  await page.goto(prefix(tenantA.id)+'/admin');
  await expect(page.getByRole('heading',{name:'Acesso restrito'})).toBeVisible();
  await page.goto(prefix(tenantA.id)+'/branding');
  await expect(page.getByText(/Somente o dono ou Platform Owner/)).toBeVisible();
  await page.goto(prefix(tenantB.id));
  await expect(page.getByText('Item fictício B')).toBeVisible();
  await expect(page.getByText('Item fictício A')).toHaveCount(0);
});

test('A: pedido demo autenticado usa preço do servidor e mantém carrinho por tenant',async({page})=>{
  await login(page,tenantA.id,users.a!);
  await page.goto(prefix(tenantA.id)+'/checkout');
  await expect(page.getByRole('heading',{name:'Pedido de demonstração'})).toBeVisible();
  await page.getByRole('spinbutton',{name:'Quantidade'}).fill('2');
  await expect(page.getByText('Subtotal indicativo: R$ 51,80')).toBeVisible();
  await page.getByRole('button',{name:'Registrar simulação sem cobrança'}).click();
  await expect(page.getByRole('heading',{name:'Simulação recebida'})).toBeVisible({timeout:30000});
  await expect(page.getByText(/R\$ 51,80/)).toBeVisible();
  await environment.withSecurityRulesDisabled(async context=>{
    const db=context.firestore() as unknown as Firestore;
    // Server output is the only source of financial values; no production write.
    const requestCode=await page.locator('code').first().textContent();
    expect(requestCode).toMatch(/^food-demo-/);
    const record=(await getDoc(doc(db,'tenants',tenantA.id,'orders',requestCode!))).data();
    expect(record).toMatchObject({tenantId:tenantA.id,subtotalCents:5180,demoOnly:true,paymentRequired:false});
  });
});

test('A: reserva privada e QR sem agendamento comercial',async({page})=>{
  await login(page,tenantA.id,users.a!);
  await page.goto(prefix(tenantA.id)+'/tables');
  await expect(page.getByRole('heading',{name:/^Mesas de/})).toBeVisible();
  await page.getByRole('button',{name:'Gerar QR privado'}).click();
  await expect(page.getByAltText(/QR privado da mesa/)).toBeVisible();
  await page.getByRole('link',{name:'Simular reserva nesta mesa'}).click();
  await expect(page.getByRole('heading',{name:'Simular reserva de mesa'})).toBeVisible();
  const date = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  await page.getByLabel('Data').fill(date);
  await page.getByLabel('Início').selectOption('19:00');
  await page.getByRole('button',{name:'Confirmar simulação sem contato real'}).click();
  await expect(page.getByRole('heading',{name:'Reserva simulada!'})).toBeVisible({timeout:30000});
  await expect(page.getByText(/Nenhuma cobrança, mensagem ou reserva comercial/)).toBeVisible();
});
