'use client';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useEffect, useState, type FormEvent } from 'react';
import { firebaseAuth, firebaseConfigured, isFirebaseDataMode } from '@/lib/firebase-client';
import { resolveFoodTenant } from '@/lib/food-tenant-repository';
import { validFoodTenantSlug } from '@/shared/food-tenant-domain';

export default function TenantDemoLoginPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentUid, setCurrentUid] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) { setReady(true); return; }
    const stop = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUid(user?.uid ?? '');
      setReady(true);
    });
    return () => stop();
  }, []);

  async function verifyAndEnter() {
    if (!validFoodTenantSlug(slug)) throw new Error('Endereço inválido.');
    const context = await resolveFoodTenant(slug);
    if (context.tenant.status === 'SUSPENDED') throw new Error('A demonstração está suspensa.');
    window.location.assign(`/t/${encodeURIComponent(context.tenant.slug)}/admin`);
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setMessage(''); setBusy(true);
    let stage: 'auth' | 'tenant' = 'auth';
    try {
      if (!firebaseAuth || !firebaseConfigured || !isFirebaseDataMode()) throw new Error('Firebase indisponível.');
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      setPassword('');
      stage = 'tenant';
      await verifyAndEnter();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Ocorreu uma falha.';
      setMessage(stage === 'auth' ? 'Falha na autenticação Firebase: ' + detail : 'Falha na autorização do tenant: ' + detail);
    } finally { setBusy(false); }
  }

  const shell = { maxWidth: 460, margin: '60px auto', padding: 24, fontFamily: 'system-ui,sans-serif' } as const;
  return <main style={shell}>
    <p><strong>DEMONSTRAÇÃO — acesso privado</strong></p>
    <h1>Entrar no Food</h1>
    <p>Autenticação Firebase e permissão do estabelecimento são verificadas separadamente. Não é o painel operacional do Baru.</p>
    {!ready ? <p role="status">Verificando sessão…</p> :
      !firebaseConfigured || !isFirebaseDataMode() ? <p role="alert">Configure Firebase/Emulator para usar o login.</p> :
      currentUid ? <section>
        <p>Uma sessão já está autenticada. Confirme se ela possui acesso a este tenant.</p>
        <button disabled={busy} onClick={() => { setBusy(true); void verifyAndEnter().catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Acesso recusado.')).finally(() => setBusy(false)); }}>Entrar neste tenant</button>{' '}
        <button disabled={busy} onClick={() => firebaseAuth && signOut(firebaseAuth)}>Trocar conta</button>
      </section> :
      <form onSubmit={login} style={{ display: 'grid', gap: 14 }}>
        <label>E-mail <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Senha <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button disabled={busy} type="submit">{busy ? 'Validando…' : 'Entrar'}</button>
      </form>}
    {message && <p role="alert">{message}</p>}
  </main>;
}
