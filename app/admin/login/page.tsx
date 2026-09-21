'use client';

import { ArrowRight, Eye, LockKeyhole, Mail, UsersRound, WalletCards, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button, LinkButton } from '@/components/baru-ui';
import { writeSession } from '@/lib/baru-repository';
import { photoUrls } from '@/lib/baru-data';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!email.trim() || password.length < 4) { setError('Informe e-mail e uma senha com pelo menos 4 caracteres.'); return; } writeSession({ uid: `demo-${email.toLowerCase()}`, name: email.split('@')[0] || 'Equipe Baru', role: 'ADMIN', demo: true }); window.location.href = '/admin'; };
  const demo = () => { writeSession({ uid: 'demo-admin', name: 'Mariana Costa', role: 'ADMIN', demo: true }); window.location.href = '/admin'; };
  return <main className="login-page"><section className="login-image" style={{ '--login-image': `url(${photoUrls.table})` } as React.CSSProperties}><div><p className="eyebrow" style={{ color: '#e8b49b' }}>Baru Gastronomia</p><h1>Mais que refeições, boas conexões.</h1></div></section><section className="login-panel"><div className="login-form"><a className="public-logo" href="/">BARU<small>Gastronomia</small></a><h2>Acesso da equipe</h2><p>Entre para operar reservas, agenda e atendimento.</p><form className="form-stack" onSubmit={submit}><label className="form-label"><span>E-mail ou usuário</span><span className="field-shell"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@baru.com.br" autoComplete="username" /></span></label><label className="form-label"><span>Senha</span><span className="field-shell"><LockKeyhole size={17} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" /><Eye size={17} aria-hidden="true" /></span></label>{error && <span className="field-error" role="alert">{error}</span>}<Button type="submit" className="button-wide">Entrar no painel <ArrowRight size={16} /></Button><button type="button" className="baru-button baru-button--secondary button-wide" onClick={demo}>Acessar modo demo</button></form><div className="role-cards"><div className="role-card"><UsersRound size={22} /><strong>Gerente</strong><span>Visão completa da operação.</span></div><div className="role-card"><WalletCards size={22} /><strong>Caixa</strong><span>Controle de mesas e pagamentos.</span></div><div className="role-card"><UserRound size={22} /><strong>Atendimento</strong><span>Reservas e experiência do cliente.</span></div></div><p className="helper-note">Acesso restrito à equipe do restaurante. A demonstração usa dados fictícios.</p><LinkButton href="/admin/setup" variant="ghost" className="button-wide">Ver modo demo e configuração</LinkButton></div></section></main>;
}
