'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth, firebaseConfigured, isFirebaseDataMode } from '@/lib/firebase-client';
import { createFoodLeadRecord, ensureFoodDemoForLead, getFoodLeads, isFoodPlatformOwner, registerBaruProspect, toggleFoodDemo } from '@/lib/food-platform-repository';
import type { FoodLead } from '@/shared/food-platform-domain';

export default function FoodPlatformLeadsPage() {
  const [uid, setUid] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [leads, setLeads] = useState<FoodLead[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function reload() { setLeads(await getFoodLeads()); }

  useEffect(() => {
    if (!firebaseAuth || !isFirebaseDataMode()) { setLoading(false); return; }
    let current = true;
    const stop = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!current) return;
      setLoading(true); setMessage('');
      setUid(user?.uid ?? '');
      if (!user) { setAuthorized(false); setLeads([]); setLoading(false); return; }
      try {
        const allowed = await isFoodPlatformOwner(user.uid);
        if (!current) return;
        setAuthorized(allowed);
        if (allowed) await reload();
        else setLeads([]);
      } catch {
        if (current) { setAuthorized(false); setLeads([]); setMessage('Não foi possível validar o acesso.'); }
      } finally { if (current) setLoading(false); }
    });
    return () => { current = false; stop(); };
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setMessage('');
    try { await action(); await reload(); setMessage('Operação concluída no Firebase do ambiente atual.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Operação não concluída.'); }
    finally { setBusy(false); }
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try {
      if (!firebaseAuth) throw new Error('Firebase Auth indisponível.');
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      setPassword('');
    } catch { setMessage('Login não autorizado ou credenciais inválidas.'); }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    await run(() => createFoodLeadRecord(businessName, 'cadastro_manual', sourceUrl));
    setBusinessName(''); setSourceUrl('');
  }

  const box = { maxWidth: 880, margin: '2rem auto', padding: 24, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 } as const;
  const button = { padding: '10px 14px', margin: '6px 8px 6px 0', cursor: 'pointer' } as const;

  if (!firebaseConfigured || !isFirebaseDataMode()) return <main style={box}><h1>Platform Owner — Food</h1><p>Disponível somente com Firebase/Emulator configurado. Nenhum seed local pode simular administração.</p></main>;
  if (loading) return <main style={box}><h1>Platform Owner — Food</h1><p>Verificando acesso…</p></main>;
  if (!uid) return <main style={box}><h1>Platform Owner — Food</h1><form onSubmit={login}><label>Email <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label> <label>Senha <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label> <button style={button}>Entrar</button></form><p role="status">{message}</p></main>;
  if (!authorized) return <main style={box}><h1>Acesso restrito</h1><p>Esta conta não possui registro ativo em platformAdmins. Papel ADMIN do restaurante não concede privilégios de plataforma.</p><button style={button} onClick={() => firebaseAuth && signOut(firebaseAuth)}>Sair</button><p role="status">{message}</p></main>;
  return <main style={box}><h1>Leads — SaaS Food</h1><p>Área interna e privada. Lead comercial ≠ tenant de demonstração ≠ cliente contratado.</p><button style={button} onClick={() => firebaseAuth && signOut(firebaseAuth)}>Sair</button>
    <section><h2>Cadastro</h2><button disabled={busy} style={button} onClick={() => run(registerBaruProspect)}>Cadastrar Baru (não convertido)</button>
    <form onSubmit={add}><label>Estabelecimento <input required minLength={3} value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></label> <label>Referência HTTPS <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} /></label> <button style={button} disabled={busy}>Cadastrar lead</button></form></section>
    <section><h2>Leads cadastrados</h2>{leads.length === 0 && <p>Nenhum lead cadastrado.</p>}
      {leads.map((lead) => <article key={lead.id} style={{ border: '1px solid #888', borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <strong>{lead.name}</strong><p>Status: {lead.status} — CONTRATO NÃO FECHADO</p><p>Autorização de marca: {lead.brandingAuthorization}</p><p>Demo: {lead.demoTenantId || 'não provisionada'}</p>
        <button style={button} disabled={busy} onClick={() => run(() => ensureFoodDemoForLead(lead.id))}>Criar/vincular demo interna</button>
        {lead.demoTenantId && <><button style={button} disabled={busy} onClick={() => run(() => toggleFoodDemo(lead.demoTenantId!, true))}>Suspender demo</button><button style={button} disabled={busy} onClick={() => run(() => toggleFoodDemo(lead.demoTenantId!, false))}>Reativar demo</button></>}
        <p><small>Provisionamento interno do registro. A vitrine, checkout e APIs tenant-aware ainda não estão conectados: não compartilhar como demo funcional.</small></p>
      </article>)}
    </section><p role="status" aria-live="polite">{message}</p>
  </main>;
}
