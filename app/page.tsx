'use client';

import { ArrowRight, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ArrowLink, LinkButton } from '@/components/baru-ui';
import { PublicLayout } from '@/components/public-shell';
import { content as demoContent, menuItems as demoMenuItems, moments as demoMoments, photoUrls, settings as demoSettings } from '@/lib/baru-data';
import { readContentAsync, readMenuItemsAsync, readMomentsAsync, readSettingsAsync } from '@/lib/baru-repository';
import { isFirebaseDataMode } from '@/lib/firebase-client';
import type { RestaurantSettings, ServiceMoment, SiteContent, MenuItem } from '@/shared/baru-domain';

export default function HomePage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(() => isFirebaseDataMode() ? null : demoSettings);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(() => isFirebaseDataMode() ? null : demoContent);
  const [moments, setMoments] = useState<ServiceMoment[]>(() => isFirebaseDataMode() ? [] : demoMoments);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => isFirebaseDataMode() ? [] : demoMenuItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([readSettingsAsync(), readContentAsync(), readMomentsAsync(), readMenuItemsAsync()]).then(([nextSettings, nextContent, nextMoments, nextItems]) => {
      if (!active) return;
      setSettings(nextSettings);
      setSiteContent(nextContent);
      setMoments(nextMoments);
      setMenuItems(nextItems);
    }).catch(() => { if (active) setError('Não foi possível carregar o conteúdo público atual.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <PublicLayout><main className="loading-state" style={{ minHeight: '70vh' }}>Carregando o Baru…</main></PublicLayout>;
  if (!settings || !siteContent) return <PublicLayout><main><section className="public-section empty-state" style={{ minHeight: '70vh' }}><p className="eyebrow">Baru Gastronomia</p><h1>Conteúdo público aguardando cadastro.</h1><p>O ambiente Firebase está ativo e não está exibindo dados de demonstração. Cadastre o conteúdo real do site para publicá-lo.</p><LinkButton href="/cardapio" variant="secondary">Ver canal oficial de pedidos <ArrowRight size={16} /></LinkButton>{error && <p className="field-error" role="alert">{error}</p>}</section></main></PublicLayout>;
  const featured = menuItems.filter((item) => item.featured && item.active).sort((left, right) => left.displayOrder - right.displayOrder).slice(0, 3);
  return <PublicLayout><main>{error && <p className="field-error" role="alert">{error}</p>}<section className="hero" style={{ '--hero-image': `url(${siteContent.heroImageUrl})` } as React.CSSProperties}><div className="hero__inner"><p className="eyebrow">{settings.city}</p><h1>{siteContent.heroTitle}</h1><p>{siteContent.heroSubtitle}</p><div className="hero__actions"><LinkButton href="/reservar">Reservar mesa <ArrowRight size={16} /></LinkButton><LinkButton href="/cardapio" variant="secondary">Ver cardápio</LinkButton>{settings.onlineOrderingUrl && <LinkButton href={settings.onlineOrderingUrl} variant="ghost">Pedir online</LinkButton>}</div></div><p className="hero__note">Boa comida<br />aproxima pessoas.</p></section><section id="o-baru" className="moments-section"><div className="public-section"><div className="moment-grid"><div className="moment-intro"><p className="eyebrow">Três momentos, uma só essência</p><h2>O dia encontra o seu sabor.</h2><p className="muted">Do café da manhã ao último brinde, cada momento é um convite para viver o presente com mais sabor.</p></div>{moments.map((moment) => <a className="moment-card" href={`/cardapio?momento=${moment.id}`} key={moment.id}><img src={moment.imageUrl} alt="" /><span className="moment-card__arrow"><ArrowRight size={16} /></span><div className="moment-card__text"><h3>{moment.name}</h3><p>{moment.eyebrow}</p></div></a>)}{!moments.length && <p className="muted">Momentos do Baru ainda não cadastrados.</p>}</div></div></section><section id="experiencia" className="public-section"><div className="section-heading"><div><p className="eyebrow">Nossos destaques</p><h2>Sabores que contam histórias.</h2></div><ArrowLink href="/cardapio">Ver cardápio completo</ArrowLink></div><div className="feature-grid">{featured.map((item) => <article className="feature-card" key={item.id}><img src={item.imageUrl} alt={item.name} /><div className="feature-card__body"><h3>{item.name}</h3><p>{item.description}</p></div></article>)}{!featured.length && <p className="muted">Destaques do cardápio ainda não cadastrados.</p>}</div></section><section id="chef" className="chef-band"><img src={siteContent.chefImageUrl} alt="Destaque do cardápio Baru" /><div className="chef-band__body"><p className="eyebrow">A cozinha Baru</p><h2>{siteContent.chefName}</h2><p>{siteContent.chefBio}</p><div className="quote">“{siteContent.quote}”</div></div></section><section className="public-section"><div className="section-heading"><div><p className="eyebrow">Mais que uma refeição</p><h2>Uma experiência completa.</h2><p>Boa comida, bons encontros, um ambiente único. Cada detalhe no Baru foi pensado para tornar o seu momento especial.</p></div><div id="localizacao" className="summary-line"><MapPin size={18} /><span>{settings.address}</span></div></div><div className="gallery-grid">{siteContent.gallery.map((image, index) => <img key={image} src={image} alt={index === 0 ? 'Prato em destaque do Baru' : 'Detalhe do cardápio Baru'} />)}</div></section><section className="cta-band" style={{ '--cta-image': `url(${siteContent.gallery[0] || photoUrls.room})` } as React.CSSProperties}><div className="cta-band__inner"><div><p className="eyebrow">Sabor, conexão e bons momentos</p><h2>Faça sua reserva.</h2></div><LinkButton href="/reservar">Reservar mesa <ArrowRight size={16} /></LinkButton></div></section></main></PublicLayout>;
}
