// SaaS Food / Condado — dedicated live staging tenant.
// Source assets are injected by build.mjs. DB is an isolated real Cloudflare D1 binding.
const ASSETS = __ASSETS__;
const TENANT = 'condado-demo';
const PRICES = new Map([
 ['espresso',['Espresso da casa',800]],['cappuccino',['Cappuccino churros',1850]],
 ['coado',['Filtrado especial',1450]],['mocha',['Mocha da tarde',1750]],
 ['tonic',['Espresso tônica',1700]],['iced',['Iced latte',1700]],
 ['cookie',['Cookie de chocolate',1050]],['brownie',['Brownie da casa',1600]],
]);
const STATUSES = {
 reservation: new Set(['SOLICITADA','ACEITA_TESTE','RECUSADA_TESTE']),
 order: new Set(['NOVO','EM_PREPARO_TESTE','CONCLUIDO_TESTE']),
};
const BASE_HEADERS = {
 'x-content-type-options':'nosniff',
 'referrer-policy':'strict-origin-when-cross-origin',
 'x-frame-options':'DENY',
 'permissions-policy':'camera=(), microphone=(), geolocation=()',
 'cache-control':'no-store, private',
 'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...BASE_HEADERS,'content-type':'application/json; charset=utf-8'}})}
function asset(body,type){return new Response(body,{headers:{...BASE_HEADERS,'content-type':type}})}
function clean(v,max=80){return typeof v==='string'?v.trim().slice(0,max):''}
async function readJson(request){const len=Number(request.headers.get('content-length')||'0');if(len>5000)throw new Error('O formulário excedeu o tamanho permitido.');const text=await request.text();if(text.length>5000)throw new Error('O formulário excedeu o tamanho permitido.');try{return JSON.parse(text)}catch{throw new Error('Os dados enviados são inválidos.')}}
async function ipHash(request,env){const ip=request.headers.get('cf-connecting-ip')||'no-ip';const message=new TextEncoder().encode(ip+':'+env.ADMIN_TOKEN+':rate');const hash=await crypto.subtle.digest('SHA-256',message);return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function limit(request,env,kind){const hash=await ipHash(request,env);const found=await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE ip_hash=? AND kind=? AND created_at>=datetime('now','-1 hour')").bind(hash,kind).first();if((found?.n||0)>=8)return false;await env.DB.prepare('INSERT INTO events(id,ip_hash,kind) VALUES (?,?,?)').bind(crypto.randomUUID(),hash,kind).run();return true}
function validDay(date,time){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))return false;const dt=new Date(date+'T12:00:00-03:00');if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==date)return false;const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const max=new Date(today+'T12:00:00-03:00');max.setUTCDate(max.getUTCDate()+45);if(date<today||date>max.toISOString().slice(0,10))return false;const day=dt.getUTCDay();if(day===0)return false;const dayOfMonth=Number(date.slice(8)),month=date.slice(0,7);const last=new Date(date.slice(0,4)+'-'+date.slice(5,7)+'-01T12:00:00-03:00');last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);if(day===6&&dayOfMonth+7>last.getUTCDate())return false;const [hh,mm]=time.split(':').map(Number);const mins=hh*60+mm;return mm%30===0&&mins>=570&&mins<=(day===6?750:1050)}
function authorized(request,env){const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');const secret=env.ADMIN_TOKEN||'';if(!token||!secret||token.length!==secret.length)return false;const a=new TextEncoder().encode(token),b=new TextEncoder().encode(secret);let delta=0;for(let i=0;i<a.length;i++)delta|=a[i]^b[i];return delta===0}
async function reservation(request,env){const data=await readJson(request);const name=clean(data.name),phone=clean(data.phone,20),date=clean(data.date,10),time=clean(data.time,5),notes=clean(data.notes,240);const party=Number(data.guests);if(data.agreement!==true)return reply({error:'É necessário concordar com o caráter demonstrativo.'},422);if(name.length<2||name.length>80||!/^[\p{L}\s'.-]+$/u.test(name)||!/^\+?[\d\s()-]{10,20}$/.test(phone)||!Number.isInteger(party)||party<1||party>8||!validDay(date,time))return reply({error:'Confira o nome, telefone, data, horário e quantidade de pessoas.'},422);if(!(await limit(request,env,'reservation')))return reply({error:'Limite de solicitações de teste atingido. Tente mais tarde.'},429);const id='R-'+crypto.randomUUID().slice(0,8).toUpperCase();await env.DB.prepare('INSERT INTO reservations(id,tenant_id,guest_name,phone,party_size,visit_date,visit_time,notes,status) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,TENANT,name,phone,party,date,time,notes,'SOLICITADA').run();return reply({id,status:'SOLICITADA',official:false,confirmed:false},201)}
async function order(request,env){const data=await readJson(request);if(!Array.isArray(data.items)||data.items.length<1||data.items.length>16)return reply({error:'Sua comanda deve conter produtos válidos.'},422);const normalized=[];let total=0;const seen=new Set();for(const item of data.items){if(!item||typeof item.id!=='string'||!PRICES.has(item.id)||!Number.isInteger(item.qty)||item.qty<1||item.qty>15||seen.has(item.id))return reply({error:'Comanda inválida.'},422);seen.add(item.id);const [name,price]=PRICES.get(item.id);normalized.push({id:item.id,name,qty:item.qty,priceCents:price});total+=price*item.qty}if(total<=0||total>200000)return reply({error:'O total da comanda é inválido.'},422);if(!(await limit(request,env,'order')))return reply({error:'Limite de comandas de teste atingido. Tente mais tarde.'},429);const id='C-'+crypto.randomUUID().slice(0,8).toUpperCase();await env.DB.prepare('INSERT INTO orders(id,tenant_id,items_json,total_cents,status) VALUES(?,?,?,?,?)').bind(id,TENANT,JSON.stringify(normalized),total,'NOVO').run();return reply({id,totalCents:total,status:'NOVO',payment:false,official:false},201)}
async function adminList(env){const [res,ord]=await Promise.all([env.DB.prepare('SELECT id,guest_name,phone,party_size,visit_date,visit_time,status,created_at FROM reservations WHERE tenant_id=? ORDER BY created_at DESC LIMIT 150').bind(TENANT).all(),env.DB.prepare('SELECT id,items_json,total_cents,status,created_at FROM orders WHERE tenant_id=? ORDER BY created_at DESC LIMIT 150').bind(TENANT).all()]);return reply({reservations:res.results||[],orders:ord.results||[],tenantId:TENANT,mode:'DEMO',official:false})}
async function update(request,env){const data=await readJson(request);if(!['reservation','order'].includes(data.kind)||typeof data.id!=='string'||!/^([RC]-[A-F0-9]{8})$/.test(data.id)||!STATUSES[data.kind].has(data.status))return reply({error:'Atualização inválida.'},422);const table=data.kind==='reservation'?'reservations':'orders';const update=await env.DB.prepare('UPDATE '+table+' SET status=? WHERE tenant_id=? AND id=?').bind(data.status,TENANT,data.id).run();if(!update.meta?.changes)return reply({error:'Registro inexistente.'},404);return reply({ok:true,kind:data.kind,id:data.id,status:data.status,official:false})}
export default {
 async fetch(request,env){
  const url=new URL(request.url);const path=url.pathname;try{
   if(request.method==='GET'){
    if(path==='/'||path==='/index.html')return asset(ASSETS['index.html'],'text/html; charset=utf-8');
    if(path==='/style.css')return asset(ASSETS['style.css'],'text/css; charset=utf-8');
    if(path==='/app.js')return asset(ASSETS['app.js'],'application/javascript; charset=utf-8');
    if(path==='/panel.js')return asset(ASSETS['panel.js'],'application/javascript; charset=utf-8');
    if(path==='/painel')return asset(ASSETS['panel.html'],'text/html; charset=utf-8');
    if(path==='/health'){const x=await env.DB.prepare('SELECT slug,publication_status FROM tenants WHERE id=?').bind(TENANT).first();return reply({healthy:!!x,tenant:x?.slug,mode:x?.publication_status})}
    if(path==='/api/admin')return authorized(request,env)?adminList(env):reply({error:'Acesso administrativo restrito.'},401);
   }
   if(request.method==='POST'){
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({error:'Envie JSON.'},415);
    if(path==='/api/reservations')return reservation(request,env);
    if(path==='/api/orders')return order(request,env);
    if(path==='/api/admin/status')return authorized(request,env)?update(request,env):reply({error:'Acesso administrativo restrito.'},401);
   }
   return reply({error:'Rota não encontrada.'},404);
  }catch(err){if(err instanceof Error&&(/formulário|dados enviados/.test(err.message)))return reply({error:err.message},400);console.error('Condado stage error:',err instanceof Error?err.name:'unknown');return reply({error:'Serviço temporariamente indisponível.'},503)}
 }
};