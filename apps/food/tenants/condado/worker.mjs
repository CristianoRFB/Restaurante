// Condado / Food tenant. Independent non-official demonstration with persistent D1.
const ASSETS=__ASSETS__, TENANT='condado-demo';
const HEAD={'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY','cache-control':'no-store','content-security-policy':"default-src 'none';script-src 'self';style-src 'self' https://fonts.googleapis.com;font-src https://fonts.gstatic.com;img-src 'self' https://images.unsplash.com https://api.qrserver.com data:;connect-src 'self';form-action 'self';base-uri 'none';frame-ancestors 'none'"};
const orderStates=['NOVO','EM_PREPARO','PRONTO','ENTREGUE','CANCELADO'];
const reservationStates=['SOLICITADA','ACEITA_TESTE','RECUSADA_TESTE'];
const send=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{...HEAD,'content-type':'application/json;charset=utf-8'}});
const file=(text,type)=>new Response(text,{headers:{...HEAD,'content-type':type}});
const clean=(v,max=120)=>typeof v==='string'?v.trim().slice(0,max):'';
const positive=(v)=>Number.isInteger(v)&&v>=1&&v<=4;
async function payload(req){const n=Number(req.headers.get('content-length')||0);if(n>7000)throw Error('Requisição muito grande');const t=await req.text();if(t.length>7000)throw Error('Requisição muito grande');try{return JSON.parse(t)}catch{throw Error('JSON inválido')}}
async function hashIp(req,env){const ip=req.headers.get('cf-connecting-ip')||'anonymous';const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+':'+env.ADMIN_TOKEN));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function limited(req,env,kind){const h=await hashIp(req,env);const found=await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE ip_hash=? AND kind=? AND created_at>=datetime('now','-1 hour')").bind(h,kind).first();if(Number(found?.n||0)>=8)return true;await env.DB.prepare('INSERT INTO events(id,ip_hash,kind) VALUES (?,?,?)').bind(crypto.randomUUID(),h,kind).run();return false}
function auth(req,env){const token=clean((req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),160),secret=env.ADMIN_TOKEN||'';if(!token||!secret||token.length!==secret.length)return false;let v=0;const a=new TextEncoder().encode(token),b=new TextEncoder().encode(secret);if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)v|=a[i]^b[i];return v===0}
function dateOK(day,time){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^\d{2}:\d{2}$/.test(time))return false;const dt=new Date(day+'T12:00:00-03:00');if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==day)return false;const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const limit=new Date(today+'T12:00:00-03:00');limit.setUTCDate(limit.getUTCDate()+45);if(day<today||day>limit.toISOString().slice(0,10))return false;const wd=dt.getUTCDay();if(wd===0)return false;const y=Number(day.slice(0,4)),m=Number(day.slice(5,7)),dd=Number(day.slice(8));const last=new Date(Date.UTC(y,m,0)).getUTCDate();if(wd===6&&dd+7>last)return false;const [hh,mm]=time.split(':').map(Number),minute=hh*60+mm;return mm%30===0&&minute>=570&&minute<=(wd===6?750:1050)}
async function menu(env){const r=await env.DB.prepare('SELECT id,name,category,description,price_cents AS priceCents,active,image_url AS image FROM catalog_items WHERE tenant_id=? ORDER BY category,id').bind(TENANT).all();return (r.results||[]).map(x=>({...x,active:Boolean(x.active)}))}
async function newReservation(req,env){
 const x=await payload(req),name=clean(x.name,80),phone=clean(x.phone,20),day=clean(x.date,10),time=clean(x.time,5),guests=Number(x.guests),notes=clean(x.notes,240);
 if(x.agreement!==true)return send({error:'Confirme que é uma solicitação demonstrativa.'},422);
 if(name.length<2||!/^[\p{L}\s'.-]+$/u.test(name)||!/^\+?[\d\s()-]{10,20}$/.test(phone)||!Number.isInteger(guests)||guests<1||guests>4||!dateOK(day,time))return send({error:'Confira data, horário, nome, telefone e até quatro pessoas.'},422);
 if(await limited(req,env,'reservation'))return send({error:'Limite de testes atingido. Tente mais tarde.'},429);
 const id='R-'+crypto.randomUUID().slice(0,8).toUpperCase();
 await env.DB.prepare('INSERT INTO reservations(id,tenant_id,guest_name,phone,party_size,visit_date,visit_time,notes,status) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,TENANT,name,phone,guests,day,time,notes,'SOLICITADA').run();
 return send({id,status:'SOLICITADA',confirmed:false,official:false},201);
}
async function currentTab(env,number){
 const tab=await env.DB.prepare("SELECT * FROM service_tabs WHERE tenant_id=? AND table_number=? AND status IN ('OPEN','CHECKOUT_REQUESTED') ORDER BY created_at DESC LIMIT 1").bind(TENANT,number).first();
 if(!tab)return {tab:null,orders:[],totalCents:0};
 const r=await env.DB.prepare('SELECT id,items_json,total_cents,status,created_at FROM orders WHERE tenant_id=? AND tab_id=? ORDER BY created_at').bind(TENANT,tab.id).all();
 const orders=(r.results||[]).map(o=>({id:o.id,items:JSON.parse(o.items_json),totalCents:o.total_cents,status:o.status,createdAt:o.created_at}));
 return {tab:{id:tab.id,table:tab.table_number,status:tab.status,createdAt:tab.created_at},orders,totalCents:orders.filter(x=>x.status!=='CANCELADO').reduce((s,x)=>s+x.totalCents,0)};
}
async function newOrder(req,env){
 const d=await payload(req),table=Number(d.table);
 if(!positive(table)||!Array.isArray(d.items)||d.items.length===0||d.items.length>16)return send({error:'Escolha a mesa e os produtos.'},422);
 const active=await env.DB.prepare('SELECT active FROM service_tables WHERE tenant_id=? AND table_number=?').bind(TENANT,table).first();
 if(!active||active.active!==1)return send({error:'Mesa indisponível.'},422);
 const all=await menu(env),ids=new Map(all.filter(x=>x.active).map(x=>[x.id,x])),seen=new Set(),items=[];let total=0;
 for(const item of d.items){const prod=ids.get(item?.id);if(!prod||!Number.isInteger(item.qty)||item.qty<1||item.qty>15||seen.has(item.id))return send({error:'Confira os itens do pedido.'},422);seen.add(item.id);items.push({id:prod.id,name:prod.name,qty:item.qty,priceCents:prod.priceCents});total+=item.qty*prod.priceCents}
 if(total<=0||total>200000)return send({error:'Total inválido.'},422);
 const open=await currentTab(env,table);if(open.tab?.status==='CHECKOUT_REQUESTED')return send({error:'Mesa aguardando fechamento. Solicite ao caixa para reabrir.'},409);
 if(await limited(req,env,'order'))return send({error:'Limite de testes atingido neste dispositivo. Tente mais tarde.'},429);
 const tabId='T-'+crypto.randomUUID().slice(0,12).toUpperCase(),orderId='C-'+crypto.randomUUID().slice(0,8).toUpperCase();
 // D1 batch is transactional, including conditional tab creation + order insertion.
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO service_tabs(id,tenant_id,table_number,status) VALUES(?,?,?,'OPEN')").bind(tabId,TENANT,table),
  env.DB.prepare("INSERT INTO orders(id,tenant_id,items_json,total_cents,status,table_number,tab_id) VALUES(?,?,?,?,?,?,(SELECT id FROM service_tabs WHERE tenant_id=? AND table_number=? AND status='OPEN' ORDER BY created_at DESC LIMIT 1))").bind(orderId,TENANT,JSON.stringify(items),total,'NOVO',table,TENANT,table)
 ]);
 return send({id:orderId,table,totalCents:total,status:'NOVO',official:false,payment:false},201);
}
async function checkout(req,env){const d=await payload(req),table=Number(d.table);if(!positive(table))return send({error:'Mesa inválida.'},422);if(await limited(req,env,'checkout'))return send({error:'Muitas solicitações. Tente mais tarde.'},429);const r=await env.DB.prepare("UPDATE service_tabs SET status='CHECKOUT_REQUESTED',requested_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND table_number=? AND status='OPEN' AND EXISTS(SELECT 1 FROM orders WHERE tab_id=service_tabs.id AND status!='CANCELADO')").bind(TENANT,table).run();if(!r.meta?.changes)return send({error:'Não existe comanda aberta nesta mesa.'},404);return send({ok:true,table,message:'Pedido de fechamento enviado ao caixa. Sem cobrança automática.'})}
async function adminData(env){
 const [r,o,t,rs,c]=await Promise.all([
 env.DB.prepare('SELECT id,guest_name,phone,party_size,visit_date,visit_time,notes,status,table_number,created_at FROM reservations WHERE tenant_id=? ORDER BY visit_date DESC,visit_time DESC LIMIT 120').bind(TENANT).all(),
 env.DB.prepare('SELECT id,items_json,total_cents,status,table_number,tab_id,created_at FROM orders WHERE tenant_id=? ORDER BY created_at DESC LIMIT 180').bind(TENANT).all(),
 env.DB.prepare("SELECT id,table_number,status,created_at,requested_at,closed_at FROM service_tabs WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100").bind(TENANT).all(),
 env.DB.prepare('SELECT table_number,label,active FROM service_tables WHERE tenant_id=? ORDER BY table_number').bind(TENANT).all(),
 env.DB.prepare('SELECT id,name,description,category,price_cents,active,image_url FROM catalog_items WHERE tenant_id=? ORDER BY category,id').bind(TENANT).all()
 ]);
 return send({tenantId:TENANT,mode:'DEMO',reservations:r.results,orders:(o.results||[]).map(x=>({...x,items:JSON.parse(x.items_json)})),tabs:t.results,tables:rs.results,menu:c.results});
}
async function adminStatus(req,env){const d=await payload(req),id=clean(d.id,30);
 if(d.kind==='order'&&orderStates.includes(d.status)&&/^C-[A-F0-9]{8}$/.test(id)){const r=await env.DB.prepare('UPDATE orders SET status=? WHERE tenant_id=? AND id=?').bind(d.status,TENANT,id).run();return r.meta?.changes?send({ok:true}):send({error:'Pedido inexistente.'},404)}
 if(d.kind==='reservation'&&reservationStates.includes(d.status)&&/^R-[A-F0-9]{8}$/.test(id)){
  const table=d.status==='ACEITA_TESTE'?Number(d.table):null;if(d.status==='ACEITA_TESTE'&&!positive(table))return send({error:'Escolha uma das quatro mesas.'},422);
  // Prevent conflicting demo assignments for a 90 minute window.
  const query="UPDATE reservations SET status=?,table_number=? WHERE id=? AND tenant_id=? AND ( ?!='ACEITA_TESTE' OR NOT EXISTS(SELECT 1 FROM reservations a JOIN reservations b ON b.id=? WHERE a.tenant_id=? AND a.id!=? AND a.status='ACEITA_TESTE' AND a.table_number=? AND a.visit_date=b.visit_date AND ABS(strftime('%s',a.visit_date||' '||a.visit_time)-strftime('%s',b.visit_date||' '||b.visit_time))<5400))";
  const r=await env.DB.prepare(query).bind(d.status,table,id,TENANT,d.status,id,TENANT,id,table).run();
  return r.meta?.changes?send({ok:true}):send({error:'Reserva inexistente ou conflito de mesa/horário.'},409);
 }
 if(d.kind==='tab'&&d.status==='CLOSED'&&/^T-[A-F0-9]{12}$/.test(id)){const r=await env.DB.prepare("UPDATE service_tabs SET status='CLOSED',closed_at=CURRENT_TIMESTAMP WHERE tenant_id=? AND id=? AND status IN ('OPEN','CHECKOUT_REQUESTED')").bind(TENANT,id).run();return r.meta?.changes?send({ok:true,receipt:'COMPROVANTE_NAO_FISCAL'}):send({error:'Comanda não encontrada ou já fechada.'},409)}
 return send({error:'Atualização inválida.'},422)
}
async function updateMenu(req,env){const d=await payload(req),id=clean(d.id,50),name=clean(d.name,100),desc=clean(d.description,280),category=clean(d.category,40),price=Number(d.priceCents);
 if(!/^[a-z0-9-]{3,50}$/.test(id)||name.length<2||!category||!Number.isInteger(price)||price<0||price>100000||typeof d.active!=='boolean')return send({error:'Confira os dados do produto.'},422);
 await env.DB.prepare('INSERT INTO catalog_items(tenant_id,id,name,category,description,price_cents,active,image_url) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,id) DO UPDATE SET name=excluded.name,category=excluded.category,description=excluded.description,price_cents=excluded.price_cents,active=excluded.active,image_url=excluded.image_url').bind(TENANT,id,name,category,desc,price,d.active?1:0,clean(d.image,500)).run();return send({ok:true})
}
export default {async fetch(req,env){
 const u=new URL(req.url),p=u.pathname;try{
  if(req.method==='GET'){
   if(p==='/'||p==='/index.html')return file(ASSETS['index.html'],'text/html; charset=utf-8');
   if(p==='/cardapio'||p.startsWith('/mesa/'))return file(ASSETS['menu.html'],'text/html; charset=utf-8');
   if(p==='/reservas')return file(ASSETS['reservas.html'],'text/html; charset=utf-8');
   if(p==='/painel'||p==='/demo/admin')return file(ASSETS['demo-admin.html'],'text/html; charset=utf-8');
   if(p==='/gestao'||p==='/painel/seguro')return file(ASSETS['panel.html'],'text/html; charset=utf-8');
   if(['style.css','app.js','panel.js','demo-admin.css','demo-admin.js'].includes(p.slice(1)))return file(ASSETS[p.slice(1)],p.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8');
   if(p==='/api/menu')return send({items:await menu(env),mode:'DEMO'});
   if(p==='/api/table'){const table=Number(u.searchParams.get('number'));return positive(table)?send({...await currentTab(env,table),mode:'DEMO'}):send({error:'Mesa inválida.'},422)}
   if(p==='/api/health'){const row=await env.DB.prepare('SELECT id FROM tenants WHERE id=?').bind(TENANT).first();return send({ok:!!row,tenant:TENANT,scope:'staging'})}
   if(p==='/api/admin')return auth(req,env)?adminData(env):send({error:'Não autorizado.'},401);
  }
  if(req.method==='POST'){
   if(req.headers.get('content-type')?.split(';')[0]!=='application/json')return send({error:'Envie JSON.'},415);
   if(p==='/api/reservations')return newReservation(req,env);
   if(p==='/api/orders')return newOrder(req,env);
   if(p==='/api/table/checkout')return checkout(req,env);
   if(p==='/api/admin/status')return auth(req,env)?adminStatus(req,env):send({error:'Não autorizado.'},401);
   if(p==='/api/admin/menu')return auth(req,env)?updateMenu(req,env):send({error:'Não autorizado.'},401);
  }
  return send({error:'Rota não encontrada.'},404);
 }catch(e){if(/JSON inválido|grande/.test(e?.message||''))return send({error:e.message},400);console.error('Food Condado:',e?.name||'error');return send({error:'Não foi possível completar a operação.'},503)}
 }};
