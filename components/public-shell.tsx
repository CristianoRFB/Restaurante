'use client';

import { Menu, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { LinkButton } from '@/components/baru-ui';
import { settings } from '@/lib/baru-data';

export function PublicHeader() {
  return <header className="public-header"><a className="public-logo" href="/" aria-label="Baru Gastronomia, início">BARU<small>Gastronomia</small></a><nav className="public-nav" aria-label="Navegação principal"><a href="/#o-baru">O Baru</a><a href="/cardapio">Cardápio</a><a href="/#experiencia">Experiência</a><a href="/#chef">Chef</a><a href="/#localizacao">Localização</a><LinkButton href="/reservar" className="header-cta">Reservar mesa</LinkButton></nav><button className="mobile-menu-button" aria-label="Abrir menu"><Menu size={26} /></button></header>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="public-footer__inner"><span>BARU Gastronomia · {settings.city}</span><span><MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {settings.address} · <Phone size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> WhatsApp</span></div></footer>;
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="app-page"><PublicHeader />{children}<PublicFooter /></div>;
}

export function PageHero({ eyebrow, title, description, imageUrl, children, className = '' }: { eyebrow: string; title: string; description: string; imageUrl: string; children?: ReactNode; className?: string }) {
  return <section className={`hero ${className}`} style={{ '--hero-image': `url(${imageUrl})` } as React.CSSProperties}><div className="hero__inner"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p>{children}</div><p className="hero__note">Boa comida<br />aproxima pessoas.</p></section>;
}
