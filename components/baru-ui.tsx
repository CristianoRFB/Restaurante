'use client';

import { ArrowRight, Check, ChevronRight, CircleAlert, Copy, LoaderCircle } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { RESERVATION_STATUS_LABELS, reservationStatusTone, type ReservationStatus } from '@/shared/baru-domain';

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'dark' }) {
  return <button className={`baru-button baru-button--${variant} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ children, href, variant = 'primary', className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string; variant?: 'primary' | 'secondary' | 'ghost' | 'dark' }) {
  return <a className={`baru-button baru-button--${variant} ${className}`} href={href} {...props}>{children}</a>;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={`status-badge status-badge--${reservationStatusTone(status)}`}><span className="status-dot" aria-hidden="true" />{RESERVATION_STATUS_LABELS[status]}</span>;
}

export function StatCard({ icon, label, value, detail, tone = 'terracotta' }: { icon: ReactNode; label: string; value: string; detail?: string; tone?: 'terracotta' | 'olive' | 'neutral' | 'gold' }) {
  return <article className={`stat-card stat-card--${tone}`}><span className="stat-card__icon">{icon}</span><div><p>{label}</p><strong>{value}</strong>{detail && <small>{detail}</small>}</div></article>;
}

export function ArrowLink({ children, href = '#' }: { children: ReactNode; href?: string }) {
  return <a className="arrow-link" href={href}>{children}<ArrowRight size={16} aria-hidden="true" /></a>;
}

export function LoadingState() {
  return <div className="loading-state" role="status"><LoaderCircle className="animate-spin" size={20} /> Carregando…</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><CircleAlert size={22} /><h2>{title}</h2><p>{description}</p></div>;
}

export function CopyButton({ value }: { value: string }) {
  const copy = async () => { try { await navigator.clipboard.writeText(value); } catch { /* clipboard opcional */ } };
  return <button className="icon-button" onClick={copy} aria-label="Copiar código" title="Copiar código"><Copy size={17} /></button>;
}

export function SuccessMark() {
  return <span className="success-mark"><Check size={28} strokeWidth={2.5} /></span>;
}

export function ChevronLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="chevron-link" href={href}>{children}<ChevronRight size={17} /></a>;
}
