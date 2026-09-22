'use client';

import { CalendarDays, ChartNoAxesCombined, ClipboardList, Home, Settings, ShieldCheck, ShoppingBag, Store, Users, Utensils, LayoutGrid, LogOut, BookOpen, WalletCards, BadgePercent, CircleDollarSign, SlidersHorizontal } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { readSession, signOutAdmin, watchAdminSession, type AdminSession } from '@/lib/baru-repository';
import { isFirebaseDataMode } from '@/lib/firebase-client';

const links = [
  { href: '/admin', label: 'Início', icon: Home },
  { href: '/admin/reservas', label: 'Reservas', icon: CalendarDays },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/agenda', label: 'Agenda', icon: ClipboardList },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/cardapio', label: 'Cardápio', icon: Utensils },
  { href: '/admin/adicionais', label: 'Adicionais', icon: SlidersHorizontal },
  { href: '/admin/promocoes', label: 'Promoções', icon: BadgePercent },
  { href: '/admin/mesas', label: 'Mesas e áreas', icon: LayoutGrid },
  { href: '/admin/caixa', label: 'Caixa', icon: WalletCards },
  { href: '/admin/financas', label: 'Finanças', icon: CircleDollarSign },
  { href: '/admin/equipe', label: 'Equipe', icon: ShieldCheck },
  { href: '/admin/relatorios', label: 'Relatórios', icon: ChartNoAxesCombined },
  { href: '/admin/conteudo', label: 'Conteúdo', icon: BookOpen },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/admin/configuracoes/pedidos', label: 'Config. pedidos', icon: ShoppingBag },
];

function isActive(path: string, href: string) { return href === '/admin' ? path === href : path.startsWith(href); }
const managerRoutes = ['/admin/cardapio', '/admin/catalogo', '/admin/adicionais', '/admin/promocoes', '/admin/mesas', '/admin/relatorios', '/admin/financas', '/admin/conteudo', '/admin/configuracoes'];
const adminRoutes = ['/admin/equipe'];
const canAccess = (path: string, role: AdminSession['role']) => {
  if (adminRoutes.some((route) => path.startsWith(route))) return role === 'ADMIN';
  return !managerRoutes.some((route) => path.startsWith(route)) || role === 'ADMIN' || role === 'MANAGER';
};

export function AdminShell({ children, title, subtitle, active = '/admin', actions }: { children: ReactNode; title?: string; subtitle?: string; active?: string; actions?: ReactNode; adminOnly?: boolean }) {
  const [session, setSession] = useState<AdminSession | null>(() => readSession());
  const [ready, setReady] = useState(() => !isFirebaseDataMode() || Boolean(readSession()));
  useEffect(() => { let mounted = true; const stop = watchAdminSession((next) => { if (!mounted) return; setSession(next); setReady(true); }); const handler = () => { if (mounted && !isFirebaseDataMode()) watchAdminSession((next) => setSession(next)); }; if (!isFirebaseDataMode()) window.addEventListener('baru-session-change', handler); return () => { mounted = false; stop(); window.removeEventListener('baru-session-change', handler); }; }, []);
  const logout = async () => { try { await signOutAdmin(); } finally { window.location.href = '/admin/login'; } };
  if (!ready) return <div className="loading-state" style={{ minHeight: '100vh' }}>Carregando acesso…</div>;
  if (!session) return <div className="app-page" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><div className="form-card" style={{ maxWidth: 440, textAlign: 'center' }}><p className="eyebrow">Baru Gastronomia</p><h1 className="font-editorial" style={{ fontSize: 38 }}>Acesso da equipe</h1><p className="muted">Entre no painel para operar reservas, agenda e operação do restaurante.</p><a className="baru-button baru-button--primary" href="/admin/login">Ir para o login</a></div></div>;
  if (!canAccess(active, session.role)) return <div className="app-page" style={{ display: 'grid', placeItems: 'center', padding: 24 }}><div className="form-card" style={{ maxWidth: 520, textAlign: 'center' }}><p className="eyebrow">Acesso restrito</p><h1 className="font-editorial" style={{ fontSize: 38 }}>Essa área é da gestão.</h1><p className="muted">Seu perfil pode continuar operando as rotinas autorizadas, mas não pode abrir esta tela.</p><a className="baru-button baru-button--primary" href="/admin">Voltar ao início</a></div></div>;
  const visibleLinks = links.filter(({ href }) => canAccess(href, session.role));
  const moreHref = session.role === 'ADMIN' || session.role === 'MANAGER' ? '/admin/configuracoes' : '/admin/reservas';
  return <div className="admin-app"><aside className="admin-sidebar"><a className="brand-mark" href="/admin">BARU<small>Gastronomia</small></a><nav className="admin-nav" aria-label="Navegação administrativa">{visibleLinks.map(({ href, label, icon: Icon }) => <a key={href} className={isActive(active, href) ? 'active' : ''} href={href}><Icon size={18} />{label}</a>)}</nav><div className="admin-sidebar__foot">Boa gastronomia<br />faz pessoas<br />extraordinárias.</div></aside><main className="admin-main"><header className="admin-topbar"><div className="admin-topbar__user"><span className="avatar">{session?.name?.slice(0, 2).toUpperCase() || 'BR'}</span><span>{session?.name || 'Demonstração Baru'}</span><button className="icon-button" onClick={logout} aria-label="Sair"><LogOut size={16} /></button></div></header><div className="admin-content">{title && <div className="section-heading"><div><h1 className="admin-title">{title}</h1>{subtitle && <p className="admin-subtitle">{subtitle}</p>}</div>{actions}</div>}{children}</div></main><nav className="admin-mobile-nav" aria-label="Navegação rápida">{visibleLinks.slice(0, 3).map(({ href, label, icon: Icon }) => <a key={href} className={isActive(active, href) ? 'active' : ''} href={href}><Icon size={18} /><span>{label}</span></a>)}<a href={moreHref}><Store size={18} /><span>Mais</span></a></nav></div>;
}

export function AdminPage({ children, ...props }: ComponentProps<typeof AdminShell>) {
  return <AdminShell {...props}>{children}</AdminShell>;
}
