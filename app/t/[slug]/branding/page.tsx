'use client';

import { useParams } from 'next/navigation';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState, type FormEvent } from 'react';
import { firebaseAuth } from '@/lib/firebase-client';
import { resolveFoodTenant } from '@/lib/food-tenant-repository';
import { saveFoodDemoBranding } from '@/lib/food-demo-branding-repository';
import { validatedDemoBranding } from '@/shared/food-demo-branding';
import type { FoodDemoBranding } from '@/shared/food-platform-domain';

const defaults: FoodDemoBranding = {
  name:'Restaurante — Demonstração', tagline:'Ambiente fictício, sem vínculo comercial.',
  primaryColor:'#315742', backgroundColor:'#FFFFFF', accentColor:'#F3E5CD', fontPreset:'system',
};
export default function FoodDemoBrandingPage() {
  const slug = useParams<{ slug: string }>().slug;
  const [branding,setBranding]=useState<FoodDemoBranding>(defaults);
  const [authorized,setAuthorized]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('Verificando acesso…');
  useEffect(()=>{
    if(!firebaseAuth){setNotice('Firebase não configurado.');return;}
    let mounted=true;
    const stop=onAuthStateChanged(firebaseAuth,async(user)=>{
      if(!mounted)return;
      setAuthorized(false);
      if(!user){setNotice('Entre com uma conta autorizada.');return;}
      try{
        const current=await resolveFoodTenant(slug);
        if(!current.canManageMembers || current.tenant.status!=='DEMO') throw new Error('Acesso restrito ao dono.');
        if(mounted){setBranding(validatedDemoBranding(current.tenant.branding));setAuthorized(true);setNotice('');}
      }catch{if(mounted)setNotice('Somente o dono ou Platform Owner pode personalizar esta demo.');}
    });
    return()=>{mounted=false;stop();};
  },[slug]);
  async function save(e:FormEvent){
    e.preventDefault();if(busy||!authorized)return;
    setBusy(true);setNotice('');
    try{await saveFoodDemoBranding(slug,branding);setNotice('Identidade interna salva com sucesso.');}
    catch(error){setNotice(error instanceof Error?error.message:'Falha ao salvar.');}
    finally{setBusy(false);}
  }
  const shell={maxWidth:700,margin:'24px auto',padding:24,fontFamily:'system-ui,sans-serif'} as const;
  return <main style={shell}>
    <strong>MARCA FICTÍCIA — PRÉVIA PRIVADA, NÃO É SITE OFICIAL DO PROSPECT</strong>
    <h1>Identidade visual do tenant</h1>
    <p><a href={'/t/'+encodeURIComponent(slug)+'/admin'}>Voltar ao admin</a></p>
    {!authorized?<p role="status">{notice}</p>:<>
      <form onSubmit={save} style={{display:'grid',gap:14,maxWidth:500}}>
        <label>Nome da demo <input required minLength={3} maxLength={120} value={branding.name} onChange={e=>setBranding(v=>({...v,name:e.target.value}))}/></label>
        <label>Frase curta <textarea maxLength={240} value={branding.tagline} onChange={e=>setBranding(v=>({...v,tagline:e.target.value}))}/></label>
        <label>Cor principal <input type="color" value={branding.primaryColor} onChange={e=>setBranding(v=>({...v,primaryColor:e.target.value}))}/></label>
        <label>Cor de fundo <input type="color" value={branding.backgroundColor ?? '#FFFFFF'} onChange={e=>setBranding(v=>({...v,backgroundColor:e.target.value}))}/></label>
        <label>Cor de detalhe <input type="color" value={branding.accentColor ?? '#F3E5CD'} onChange={e=>setBranding(v=>({...v,accentColor:e.target.value}))}/></label>
        <label>Tipografia <select value={branding.fontPreset ?? 'system'} onChange={e=>setBranding(v=>({...v,fontPreset:e.target.value as 'system'|'serif'|'rounded'}))}>
          <option value="system">Sistema</option><option value="serif">Editorial</option><option value="rounded">Arredondada</option>
        </select></label>
        <button disabled={busy}>{busy?'Salvando…':'Salvar identidade DEMO'}</button>
      </form>
      <h2>Prévia interna</h2>
      <section style={{background:branding.backgroundColor,borderTop:'6px solid '+branding.primaryColor,
        color:branding.primaryColor,borderRadius:10,padding:24,
        fontFamily:branding.fontPreset==='serif'?'Georgia,serif':branding.fontPreset==='rounded'?'Trebuchet MS,sans-serif':'system-ui,sans-serif'}}>
        <h3>{branding.name}</h3><p>{branding.tagline}</p>
        <div aria-hidden="true" style={{height:5,width:110,backgroundColor:branding.accentColor,borderRadius:5}}/>
      </section>
      <p role="status" aria-live="polite">{notice}</p>
      <p>Não carregamos logotipo, dados de contato, imagens ou marca oficial de leads sem autorização.</p>
    </>}
  </main>;
}
