'use client';

import { ArrowRight, Eye, LockKeyhole, Mail, UsersRound, WalletCards, UserRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Button, LinkButton } from '@/components/baru-ui';
import { isFirebaseDataMode } from '@/lib/firebase-client';
import { readContentAsync, signInAdmin, writeSession } from '@/lib/baru-repository';
import { content as fallbackContent } from '@/lib/baru-data';
import type { SiteContent } from '@/shared/baru-domain';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(() => isFirebaseDataMode() ? null : fallbackContent);
  useEffect(() => { let active = true; readContentAsync().then((next) => { if (active) setSiteContent(next); }).catch(() => undefined).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!email.trim() || password.length < 4) { setError('Informe e-mail e uma senha com pelo menos 4 caracteres.'); return; } setError(''); setSubmitting(true); try { if (isFirebaseDataMode()) await signInAdmin(email.trim(), password); else writeSession({ uid: `demo-${email.toLowerCase()}`, name: email.split('@')[0] || 'Equipe Baru', role: 'ADMIN', demo: true }); window.location.href = '/admin'; } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível autenticar.'); setSubmitting(false); } };
  const demo = () => { writeSession({ uid: 'demo-admin', name: 'Mariana Costa', role: 'ADMIN', demo: true }); window.location.href = '/admin'; };
  return <main className="login-page"><section className="login-image" style={{ '--login-image': siteContent?.gallery[0] ? `url(${siteContent.gallery[0]})` : 'none' } as React.CSSProperties}><div><p className="eyebrow" style={{ color: '#e8b49b' }}>Baru Gastronomia</p><h1>Mais que refeições, boas conexões.</h1></div></section><section className="login-panel"><div className="login-form"><a className="public-logo" href="/">BARU<small>Gastronomia</small></a><h2>Acesso da equipe</h2><p>Entre para operar reservas, agenda e operação do restaurante.</p><form className="form-stack" onSubmit={submit}><label className="form-label"><span>E-mail ou usuário</span><span className="field-shell"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@baru.com.br" autoComplete="username" disabled={!ready} /></span></label><label className="form-label"><span>Senha</span><span className="field-shell"><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" disabled={!ready} /><Eye size={17} aria-hidden="true" /></span></label>{error && <span className="field-error" role="alert">{error}</span>}<Button type="submit" className="button-wide" disabled={!ready || submitting}>{submitting ? 'Autenticando…' : <>Entrar no painel <ArrowRight size={16} /></>}</Button><button type="button" className="baru-button baru-button--secondary button-wide" onClick={demo} disabled={!ready}>Acessar modo demo</button></form><div className="role-cards"><div className="role-card"><UsersRound size={22} /><strong>Gerente</strong><span>Visão completa da operação.</span></div><div className="role-card"><WalletCards size={22} /><strong>Caixa</strong><span>Controle da operação e mesas.</span></div><div className="role-card"><UserRound size={22} /><strong>Atendimento</strong><span>Reservas e experiência do cliente.</span></div></div><p className="helper-note">Acesso restrito à equipe do restaurante. O ambiente pode usar autenticação Firebase ou modo demo controlado.</p><LinkButton href="/admin/setup" variant="ghost" className="button-wide">Ver modo demo e configuração</LinkButton></div></section></main>;
}
