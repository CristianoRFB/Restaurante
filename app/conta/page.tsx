'use client';

import { ArrowRight, LogOut, Mail, MessageCircle, ShoppingBag, UserRound } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/baru-ui';
import { PageHero, PublicLayout } from '@/components/public-shell';
import { createCustomerAccount, signInCustomer, signOutCustomer, watchCustomerAccount } from '@/lib/customer-account';
import { photoUrls, settings } from '@/lib/baru-data';
import type { CustomerAccount } from '@/shared/baru-domain';

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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => watchCustomerAccount(setAccount), []);
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

  return <PublicLayout><main className="account-page"><PageHero eyebrow="Sua experiência Baru" title="Minha conta" description="Acompanhe seu acesso e encontre os caminhos oficiais para reservar ou pedir online." imageUrl={photoUrls.table} />
    <section className="public-section">
      {account ? <div className="reservation-card"><section className="account-panel"><p className="eyebrow">Acesso confirmado</p><h2>Olá, {account.name}.</h2><p className="muted">Sua conta está autenticada pelo Firebase. Seus pedidos online são realizados com segurança pelo parceiro oficial de pedidos.</p><div className="summary-line"><Mail size={17} /><span>{account.email}</span></div>{account.whatsapp && <div className="summary-line"><MessageCircle size={17} /><span>+{account.whatsapp}</span></div>}<div className="form-actions"><a className="baru-button baru-button--primary" href={settings.onlineOrderingUrl} target="_blank" rel="noreferrer"><ShoppingBag size={16} /> Pedir no iFood <ArrowRight size={15} /></a><LinkButton href="/reservar" variant="secondary">Reservar mesa</LinkButton><Button variant="ghost" onClick={logout}><LogOut size={16} /> Sair</Button></div></section><aside className="reservation-summary"><img src={photoUrls.restaurant} alt="Ambiente do Baru" /><h2>Pedido online</h2><p className="muted">O pagamento e o acompanhamento do pedido acontecem no iFood oficial do Baru.</p><a className="panel-link" href={settings.officialMenuUrl} target="_blank" rel="noreferrer">Abrir cardápio oficial <ArrowRight size={14} /></a></aside></div> : <div className="reservation-card"><form className="reservation-form" onSubmit={submit} noValidate><div><p className="eyebrow">Acesso do cliente</p><h2 className="font-editorial" style={{ margin: '10px 0 0', fontSize: 32 }}>{mode === 'login' ? 'Entre na sua conta.' : 'Crie sua conta.'}</h2></div>{mode === 'register' && <><label className="form-label"><span>Nome completo</span><span className="field-shell"><UserRound size={17} /><input value={form.name} onChange={(event) => set('name', event.target.value)} autoComplete="name" required /></span></label><label className="form-label"><span>WhatsApp <span className="muted">(opcional)</span></span><span className="field-shell"><MessageCircle size={17} /><input value={form.whatsapp} onChange={(event) => set('whatsapp', event.target.value)} inputMode="tel" autoComplete="tel" /></span></label></>}<label className="form-label"><span>E-mail</span><span className="field-shell"><Mail size={17} /><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} autoComplete="email" required /></span></label><label className="form-label"><span>Senha</span><span className="field-shell"><UserRound size={17} /><input type="password" value={form.password} onChange={(event) => set('password', event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required /></span></label>{error && <p className="field-error" role="alert">{error}</p>}<Button type="submit" className="button-wide" disabled={submitting}>{submitting ? 'Aguarde…' : <>{mode === 'login' ? 'Entrar' : 'Criar conta'} <ArrowRight size={16} /></>}</Button><button type="button" className="panel-link account-toggle" onClick={() => { setMode((current) => current === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}</button></form><aside className="reservation-summary"><img src={photoUrls.room} alt="Ambiente do Baru" /><h2>Compre online</h2><p className="muted">Para concluir uma compra real, use o parceiro oficial do Baru. Não armazenamos dados de pagamento aqui.</p><a className="baru-button baru-button--secondary button-wide" href={settings.onlineOrderingUrl} target="_blank" rel="noreferrer"><ShoppingBag size={16} /> Pedir no iFood</a></aside></div>}
    </section>
  </main></PublicLayout>;
}
