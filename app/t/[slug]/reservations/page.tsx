'use client';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { firebaseAuth } from '@/lib/firebase-client';
import { resolveFoodTenant } from '@/lib/food-tenant-repository';
import { listFoodDemoTables } from '@/lib/food-tenant-table-repository';
import type { FoodDemoTable } from '@/shared/food-demo-reservation';
import type { FoodTenantContext } from '@/shared/food-tenant-domain';

interface Receipt { id:string; tenantId:string;tableId:string;date:string;time:string;status:string;created:boolean;demoOnly:boolean; }
export default function FoodDemoReservationPage({params}:{params:{slug:string}}){
  const slug=params.slug;
  const [ctx,setCtx]=useState<FoodTenantContext|null>(null);
  const [tables,setTables]=useState<FoodDemoTable[]>([]);
  const [tableId,setTableId]=useState('');
  const [date,setDate]=useState('');
  const [time,setTime]=useState('19:00');
  const [partySize,setPartySize]=useState(2);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('Carregando…');
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const idRef=useRef('');
  useEffect(()=>{
    if(!firebaseAuth){setNotice('Firebase indisponível.');return;}
    let live=true;
    const stop=onAuthStateChanged(firebaseAuth,async user=>{
      if(!user){if(live){setCtx(null);setNotice('Faça login para simular uma reserva.');}return;}
      try{
        const current=await resolveFoodTenant(slug);
        if(current.tenant.status!=='DEMO')throw new Error('Tenant suspenso.');
        const data=(await listFoodDemoTables(current)).filter(t=>t.active&&t.state==='AVAILABLE');
        const selected=new URLSearchParams(window.location.search).get('tableId')||'';
        if(live){setCtx(current);setTables(data);setTableId(data.some(t=>t.id===selected)?selected:(data[0]?.id||''));setNotice('');}
      }catch{if(live){setCtx(null);setNotice('Acesso não autorizado ou demo indisponível.');}}
    });
    return()=>{live=false;stop();};
  },[slug]);
  function change(){idRef.current='';setReceipt(null);}
  async function submit(e:FormEvent){
    e.preventDefault();if(!ctx||busy||receipt||!tableId||!date)return;
    if(process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS!=='true'){setNotice('Disponível somente com Emulator habilitado.');return;}
    const user=firebaseAuth?.currentUser;
    if(!user){setNotice('Sessão expirada.');return;}
    if(!idRef.current)idRef.current='reserve-demo-'+crypto.randomUUID().replaceAll('-','');
    setBusy(true);setNotice('');
    try{
      const response=await fetch('/api/t/'+encodeURIComponent(ctx.tenant.id)+'/reservations',{
        method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+await user.getIdToken()},
        body:JSON.stringify({clientRequestId:idRef.current,tableId,date,time,partySize}),
      });
      const data=await response.json() as Receipt & {error?:string};
      if(!response.ok)throw new Error(data.error||'Horário indisponível.');
      if(data.demoOnly!==true||data.tenantId!==ctx.tenant.id||data.id!==idRef.current)throw new Error('Resposta incompatível.');
      setReceipt(data);
    }catch(e){setNotice(e instanceof Error?e.message:'Não foi possível registrar simulação.');}
    finally{setBusy(false);}
  }
  const shell={maxWidth:700,margin:'2rem auto',padding:24,fontFamily:'system-ui,sans-serif',lineHeight:1.6} as const;
  if(!ctx)return <main style={shell}><h1>Reserva fictícia de mesa</h1><p role="status">{notice}</p><a href={'/t/'+encodeURIComponent(slug)+'/login'}>Entrar</a></main>;
  return <main style={shell}><strong>DEMONSTRAÇÃO PRIVADA — NÃO É RESERVA OFICIAL</strong>
    <h1>Simular reserva de mesa</h1><p><a href={'/t/'+encodeURIComponent(slug)}>Voltar ao tenant</a></p>
    {receipt?<section role="status"><h2>Reserva simulada!</h2><p>Código: {receipt.id}</p>
      <p>{receipt.date} às {receipt.time} — 90 minutos — mesa {receipt.tableId}</p>
      <p>Nenhuma cobrança, mensagem ou reserva comercial foi efetuada.</p>
      <button type="button" onClick={()=>{setReceipt(null);idRef.current='';}}>Nova simulação</button></section>:
      <form onSubmit={submit} style={{display:'grid',gap:12,maxWidth:420}}>
        <label>Mesa <select required value={tableId} onChange={e=>{change();setTableId(e.target.value);}}>
          <option value="">Selecione</option>{tables.map(t=><option key={t.id} value={t.id}>{t.name} — {t.capacity} lugares</option>)}</select></label>
        <label>Data <input required type="date" value={date} onChange={e=>{change();setDate(e.target.value);}}/></label>
        <label>Início <select required value={time} onChange={e=>{change();setTime(e.target.value);}}>
          {Array.from({length:24},(_,i)=>{const minute=600+i*30;return String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');}).map(t=><option key={t} value={t}>{t}</option>)}
        </select></label>
        <label>Pessoas <input required type="number" min={1} max={20} value={partySize} onChange={e=>{change();setPartySize(Number(e.target.value));}}/></label>
        <p>Bloqueio simulado de 90 minutos. Reservas sobrepostas na mesma mesa são recusadas pelo servidor.</p>
        <button disabled={busy||!tableId||!date}>{busy?'Registrando…':'Confirmar simulação sem contato real'}</button>
      </form>}
    <p role="alert" aria-live="polite">{notice}</p>
    <p><a href={'/t/'+encodeURIComponent(slug)+'/tables'}>Ver mesas e QR demonstrativos</a></p>
  </main>;
}
