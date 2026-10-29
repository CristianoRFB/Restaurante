'use client';

import { useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { firebaseAuth } from '@/lib/firebase-client';
import { listFoodDemoTables, saveFoodDemoTable } from '@/lib/food-tenant-table-repository';
import { resolveFoodTenant } from '@/lib/food-tenant-repository';
import type { FoodDemoTable } from '@/shared/food-demo-reservation';
import type { FoodTenantContext } from '@/shared/food-tenant-domain';

export default function FoodDemoTables() {
  const slug = useParams<{ slug: string }>().slug;

  const [ctx,setCtx]=useState<FoodTenantContext|null>(null);
  const [tables,setTables]=useState<FoodDemoTable[]>([]);
  const [error,setError]=useState('Verificando acesso…');
  const [busy,setBusy]=useState(false);
  const [name,setName]=useState('Mesa demonstração');
  const [capacity,setCapacity]=useState(4);
  const [qr,setQr]=useState<Record<string,string>>({});
  useEffect(()=>{
    if(!firebaseAuth){setError('Firebase indisponível.');return;}
    let live=true;
    const unsub=onAuthStateChanged(firebaseAuth,async user=>{
      if(!user){if(live){setCtx(null);setError('Faça login para acessar as mesas.');}return;}
      try{
        const current=await resolveFoodTenant(slug);
        const data=await listFoodDemoTables(current);
        if(live){setCtx(current);setTables(data);setError('');}
      }catch{if(live)setError('Acesso negado ou tenant inexistente.');}
    });
    return()=>{live=false;unsub();};
  },[slug]);
  async function refresh(current:FoodTenantContext){setTables(await listFoodDemoTables(current));}
  async function add(e:FormEvent){
    e.preventDefault();if(!ctx||busy)return;setBusy(true);setError('');
    try{
      const fresh=await resolveFoodTenant(ctx.tenant.id);
      await saveFoodDemoTable(fresh,{name,capacity,active:true,state:'AVAILABLE'});
      await refresh(fresh);setCtx(fresh);
    }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar.');}
    finally{setBusy(false);}
  }
  async function change(t:FoodDemoTable,state:FoodDemoTable['state'],active:boolean){
    if(!ctx||busy)return;setBusy(true);setError('');
    try{const fresh=await resolveFoodTenant(ctx.tenant.id);await saveFoodDemoTable(fresh,{...t,state,active});await refresh(fresh);setCtx(fresh);}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível alterar mesa.');}
    finally{setBusy(false);}
  }
  async function makeQr(t:FoodDemoTable){
    const url=new URL('/t/'+encodeURIComponent(slug)+'/reservations',window.location.origin);
    url.searchParams.set('tableId',t.id);
    // Private demo QR only; never claim this is a published restaurant reservation link.
    setQr(old=>({...old,[t.id]:''}));
    try{const image=await QRCode.toDataURL(url.toString(),{errorCorrectionLevel:'M',margin:2,width:260});setQr(old=>({...old,[t.id]:image}));}
    catch{setError('Não foi possível gerar o QR.');}
  }
  const shell={maxWidth:900,margin:'2rem auto',padding:24,fontFamily:'system-ui,sans-serif'} as const;
  if(!ctx)return <main style={shell}><h1>Mesas • demo interna</h1><p role="status">{error}</p><a href={'/t/'+encodeURIComponent(slug)+'/login'}>Entrar</a></main>;
  return <main style={shell}><p><strong>DEMONSTRAÇÃO PRIVADA — NÃO É RESERVA OFICIAL</strong></p>
    <h1>Mesas de {ctx.tenant.branding.name}</h1><p><a href={'/t/'+encodeURIComponent(slug)}>Voltar ao cardápio</a></p>
    {ctx.canManageCatalog && <form onSubmit={add}><h2>Nova mesa</h2>
      <label>Nome <input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>{' '}
      <label>Capacidade <input required type="number" min={1} max={20} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>{' '}
      <button disabled={busy}>Cadastrar mesa demo</button></form>}
    <p role="status">{error}</p><h2>Mesas ({tables.length})</h2>
    {tables.map(t=><article key={t.id} style={{border:'1px solid #999',borderRadius:8,padding:12,marginBottom:10}}>
      <strong>{t.name}</strong> — {t.capacity} lugares — {t.state} {t.active?'ativa':'inativa'}
      <p><a href={'/t/'+encodeURIComponent(slug)+'/reservations?tableId='+encodeURIComponent(t.id)}>Simular reserva nesta mesa</a></p>
      {ctx.canManageCatalog&&<div>
        <button disabled={busy} onClick={()=>change(t,t.state,!t.active)}>{t.active?'Inativar':'Ativar'}</button>{' '}
        <button disabled={busy} onClick={()=>change(t,t.state==='AVAILABLE'?'MAINTENANCE':'AVAILABLE',t.active)}>{t.state==='AVAILABLE'?'Em manutenção':'Liberar mesa'}</button>{' '}
        <button disabled={busy} onClick={()=>makeQr(t)}>Gerar QR privado</button>
      </div>}
      {qr[t.id]&&<figure><img src={qr[t.id]} alt={'QR privado da mesa '+t.name} width={260} height={260}/>
        <figcaption>QR demonstrativo: exige login e aponta para este tenant. Não divulgar como sistema oficial.</figcaption></figure>}
    </article>)}
  </main>;
}
