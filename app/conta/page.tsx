'use client';

import { ArrowRight, LogOut, Mail, MessageCircle, ShoppingBag, UserRound } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/baru-ui';
import { PageHero, PublicLayout } from '@/components/public-shell';
import { createCustomerAccount, signInCustomer, signOutCustomer, watchCustomerAccount } from '@/lib/customer-account';
import { content as fallbackContent, settings as fallbackSettings } from '@/lib/baru-data';
import { readContentAsync, readSettingsAsync } from '@/lib/baru-repository';
import { isFirebaseDataMode } from '@/lib/firebase-client';
import type { CustomerAccount, RestaurantSettings, SiteContent } from '@/shared/baru-domain';

const initialForm = { name: '', email: '', password: '', whatsapp: '' };

function friendlyAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('email-already-in-use')) return 'Este e-mail já possui uma conta. Entre com sua senha.';
  if (message.includes('invalid-credential') || message.includes('wrong-password')) return 'E-mail ou senha não conferem.';
  if (message.includes('too-many-requests')) return 'Muitas tentativas. Aguarde um momento antes de tentar novamente.';
  return message || 'Não foi possível concluir o acesso agora. Tente novamente.';
}

export default function CustomerAccountPage() {
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(() => isFirebaseDataMode() ? null : fallbackSettings);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(() => isFirebaseDataMode() ? null : fallbackContent);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { const unsubscribe = watchCustomerAccount(setAccount); let active = true; Promise.all([readSettingsAsync(), readContentAsync()]).then(([nextSettings, nextContent]) => { if (!active) return; setSettings(nextSettings); setSiteContent(nextContent); }).catch(() => { if (active) setError('Não foi possível carregar as configurações públicas.'); }); return () => { active = false; unsubscribe(); }; }, []);
  const set = (key: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'register') await createCustomerAccount(form);
      else await signInCustomer(form.email, form.password);
      setForm(initialForm);
    } catch (caught) {
      setError(friendlyAuthError(caught));
      setSubmitting(false);
    }
  };
  const logout = async () => {
    try { await signOutCustomer(); } catch { setError('Não foi possível encerrar a sessão agora.'); }
  };

  if (!settings) return <PublicLayout><main className="account-page"><PageHero eyebrow="Sua experiência Baru" title="Minha conta" description="Acompanhe seu acesso e encontre os caminhos oficiais para reservar ou pedir online." imageUrl={siteContent?.gallery[0]} /><section className="public-section empty-state" style={{ minHeight: '50vh' }}><h2>Configurações públicas aguardando publicação.</h2><p>O ambiente Firebase não exibe conteúdo de demonstração enquanto os dados operacionais não estão completos.</p>{error && <p className="field-error" role="alert">{error}</p>}</section></main></PublicLayout>;
  return <PublicLayout><main className="account-page"><PageHero eyebrow="Sua experiência Baru" title="Minha conta" description="Acompanhe seu acesso e encontre os caminhos oficiais para reservar ou pedir online." imageUrl={siteContent?.gallery[0]} />
    <section className="public-section">
      {account ? <div className="reservation-card"><section className="account-panel"><p className="eyebrow">Acesso confirmado</p><h2>Olá, {account.name}.</h2><p className="muted">Sua conta está autenticada pelo Firebase e pode acompanhar pedidos e reservas do Baru.</p><div className="summary-line"><Mail size={17} /><span>{account.email}</span></div>{account.whatsapp && <div className="summary-line"><MessageCircle size={17} /><span>+{account.whatsapp}</span></div>}<div className="form-actions"><LinkButton href="/cardapio"><ShoppingBag size={16} /> Pedir agora <ArrowRight size={15} /></LinkButton><LinkButton href="/conta/pedidos" variant="secondary">Meus pedidos</LinkButton><LinkButton href="/conta/reservas" variant="ghost">Minhas reservas</LinkButton><LinkButton href="/reservar" variant="ghost">Reservar mesa</LinkButton><Button variant="ghost" onClick={logout}><LogOut size={16} /> Sair</Button></div></section><aside className="reservation-summary">{siteContent?.gallery[1] && <img src={siteContent.gallery[1]} alt="Prato do cardápio Baru" />}<h2>Seu espaço Baru</h2><p className="muted">Acesse pedidos, reservas e preferências em um só lugar.</p><LinkButton href="/conta/pedidos" variant="secondary">Abrir meus pedidos <ArrowRight size={14} /></LinkButton></aside></div> : <div className="reservation-card"><form className="reservation-form" onSubmit={submit} noValidate><div><p className="eyebrow">Acesso do cliente</p><h2 className="font-editorial" style={{ margin: '10px 0 0', fontSize: 32 }}>{mode === 'login' ? 'Entre na sua conta.' : 'Crie sua conta.'}</h2></div>{mode === 'register' && <><label className="form-label"><span>Nome completo</span><span className="field-shell"><UserRound size={17} /><input value={form.name} onChange={(event) => set('name', event.target.value)} autoComplete="name" required /></span></label><label className="form-label"><span>WhatsApp <span className="muted">(opcional)</span></span><span className="field-shell"><MessageCircle size={17} /><input value={form.whatsapp} onChange={(event) => set('whatsapp', event.target.value)} inputMode="tel" autoComplete="tel" /></span></label></>}<label className="form-label"><span>E-mail</span><span className="field-shell"><Mail size={17} /><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} autoComplete="email" required /></span></label><label className="form-label"><span>Senha</span><span className="field-shell"><UserRound size={17} /><input type="password" value={form.password} onChange={(event) => set('password', event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required /></span></label>{error && <p className="field-error" role="alert">{error}</p>}<Button type="submit" className="button-wide" disabled={submitting}>{submitting ? 'Aguarde…' : <>{mode === 'login' ? 'Entrar' : 'Criar conta'} <ArrowRight size={16} /></>}</Button><button type="button" className="panel-link account-toggle" onClick={() => { setMode((current) => current === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}</button></form><aside className="reservation-summary">{siteContent?.gallery[2] && <img src={siteContent.gallery[2]} alt="Prato do cardápio Baru" />}<h2>Compre online</h2><p className="muted">Monte e finalize seu pedido dentro do site do Baru.</p><LinkButton href="/cardapio" variant="secondary" className="button-wide"><ShoppingBag size={16} /> Abrir cardápio</LinkButton></aside></div>}
    </section>
  </main></PublicLayout>;
}
