'use client';

import { ArrowRight, ExternalLink, Search, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, LinkButton, LoadingState } from '@/components/baru-ui';
import { PageHero, PublicLayout } from '@/components/public-shell';
import { photoUrls, settings as fallbackSettings } from '@/lib/baru-data';
import { readCategoriesAsync, readMenuItemsAsync, readMomentsAsync, readSettingsAsync } from '@/lib/baru-repository';
import { formatMoney, type MenuCategory, type MenuItem, type RestaurantSettings, type ServiceMomentId } from '@/shared/baru-domain';

export default function MenuPage() {
  const [selectedMoment, setSelectedMoment] = useState<ServiceMomentId | 'all'>(() => typeof window === 'undefined' ? 'all' : new URLSearchParams(window.location.search).get('momento') || 'all');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [moments, setMoments] = useState<Array<{ id: ServiceMomentId; name: string; active: boolean; displayOrder: number }>>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([readCategoriesAsync(), readMenuItemsAsync(), readMomentsAsync(), readSettingsAsync()]).then(([nextCategories, nextItems, nextMoments, nextSettings]) => {
      if (!active) return;
      setCategories(nextCategories.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder));
      setMenuItems(nextItems.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder));
      setMoments(nextMoments.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder));
      setSettings(nextSettings);
    }).catch(() => { if (active) setError('Não foi possível carregar o catálogo agora. Você pode abrir o cardápio oficial abaixo.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => menuItems.filter((item) => (selectedMoment === 'all' || item.serviceMomentIds.includes(selectedMoment)) && `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [menuItems, query, selectedMoment]);
  const orderUrl = settings.onlineOrderingUrl || fallbackSettings.onlineOrderingUrl;
  const officialMenuUrl = settings.officialMenuUrl || fallbackSettings.officialMenuUrl;
  return <PublicLayout><main className="menu-page"><PageHero className="menu-hero" eyebrow="Sabores da nossa terra" title="Cardápio" description="Ingredientes do mundo. Raízes da nossa terra. Uma cozinha que conta histórias." imageUrl={photoUrls.steak}><a className="baru-button baru-button--primary" href={orderUrl} target="_blank" rel="noreferrer"><ShoppingBag size={16} /> Pedir online <ExternalLink size={14} /></a></PageHero><section className="public-section"><div className="menu-online-callout"><div><p className="eyebrow">Pedido online oficial</p><h2>Compre com segurança pelo iFood.</h2><p>O pagamento, a entrega e o acompanhamento do pedido são feitos no canal oficial do Baru.</p></div><a className="baru-button baru-button--dark" href={orderUrl} target="_blank" rel="noreferrer"><ShoppingBag size={17} /> Pedir no iFood <ArrowRight size={15} /></a></div>{error && <p className="field-error" role="alert">{error}</p>}{loading ? <LoadingState /> : <>{moments.length > 0 && <nav className="menu-tabs" aria-label="Momentos do Baru"><button className={`menu-tab ${selectedMoment === 'all' ? 'active' : ''}`} onClick={() => setSelectedMoment('all')}>Todos</button>{moments.map((moment) => <button key={moment.id} className={`menu-tab ${selectedMoment === moment.id ? 'active' : ''}`} onClick={() => setSelectedMoment(moment.id)}>{moment.name}</button>)}</nav>}<div className="menu-toolbar"><label className="field-shell field-shell--search"><Search size={17} aria-hidden="true" /><span className="visually-hidden">Buscar no cardápio</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar um prato, ingrediente ou categoria…" /></label>{moments.length > 0 && <label className="field-shell"><span className="visually-hidden">Filtrar momento</span><select onChange={(event) => setSelectedMoment(event.target.value as ServiceMomentId | 'all')} value={selectedMoment}><option value="all">Todos os itens</option>{moments.map((moment) => <option key={moment.id} value={moment.id}>{moment.name}</option>)}</select></label>}</div>{categories.map((category) => { const items = filtered.filter((item) => item.categoryId === category.id); if (!items.length) return null; return <section className="menu-category" key={category.id}><div className="menu-category__heading"><div><h2>{category.name}</h2><p className="eyebrow">{category.subtitle}</p></div><p>Pratos autorais e ingredientes frescos para compartilhar a mesa.</p></div><div className="menu-grid">{items.map((item) => <article className="menu-item" key={item.id}><img src={item.imageUrl} alt={item.name} /><div className="menu-item__title"><h3>{item.name}</h3><strong>{formatMoney(item.priceCents)}</strong></div><p>{item.description}</p>{item.featured && <span className="mini-badge">Destaque</span>}<a className="menu-item__order" href={orderUrl} target="_blank" rel="noreferrer">Pedir este item <ArrowRight size={14} /></a></article>)}</div></section>; })}{!filtered.length && <EmptyState title="Cardápio oficial disponível" description="O catálogo próprio ainda não possui itens publicados. Abra o cardápio oficial do Baru ou faça seu pedido no canal oficial." />}</>}<div className="menu-external-links"><a className="baru-button baru-button--secondary" href={officialMenuUrl} target="_blank" rel="noreferrer">Ver cardápio oficial <ExternalLink size={15} /></a><LinkButton href="/conta" variant="ghost">Minha conta</LinkButton></div></section><section className="cta-band" style={{ '--cta-image': `url(${photoUrls.restaurant})` } as React.CSSProperties}><div className="cta-band__inner"><div><p className="eyebrow">Momentos à mesa</p><h2>Boa comida aproxima pessoas.</h2></div><LinkButton href="/reservar">Reservar mesa <ArrowRight size={16} /></LinkButton></div></section></main></PublicLayout>;
}
