'use client';

import { useParams } from 'next/navigation';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { firebaseAuth, isFirebaseDataMode } from '@/lib/firebase-client';
import { listFoodTenantMenuItems, resolveFoodTenant } from '@/lib/food-tenant-repository';
import type { FoodTenantContext, FoodTenantMenuItem } from '@/shared/food-tenant-domain';

export default function PrivateFoodDemo() {
  const slug = useParams<{ slug: string }>().slug;
  const [context, setContext] = useState<FoodTenantContext | null>(null);
  const [items, setItems] = useState<FoodTenantMenuItem[]>([]);
  const [message, setMessage] = useState('Verificando sessão e permissões…');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth || !isFirebaseDataMode()) { setMessage('Firebase/Emulator não configurado.'); setLoading(false); return; }
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setContext(null); setItems([]); setLoading(true);
      if (!user) { setMessage('Você precisa entrar antes de visualizar uma demonstração privada.'); setLoading(false); return; }
      try {
        const tenantContext = await resolveFoodTenant(slug);
        const catalog = await listFoodTenantMenuItems(tenantContext);
        if (active) { setContext(tenantContext); setItems(catalog.filter((item) => item.active)); setMessage(''); }
      } catch {
        if (active) setMessage('Demonstração não encontrada, suspensa ou sem permissão para esta conta.');
      } finally { if (active) setLoading(false); }
    });
    return () => { active = false; unsubscribe(); };
  }, [slug]);

  const shell = { maxWidth: 940, margin: '2rem auto', padding: 24, fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 } as const;
  return <main style={shell}>
    <p><strong>DEMONSTRAÇÃO INTERNA • NÃO É SISTEMA OFICIAL DE QUALQUER ESTABELECIMENTO</strong></p>
    {loading ? <p role="status">Carregando catálogo…</p> : !context ?
      <section><h1>Prévia indisponível</h1><p role="alert">{message}</p><p><a href={`/t/${encodeURIComponent(slug)}/login`}>Entrar com conta autorizada</a></p></section> :
      <><header style={{
        borderTop: '6px solid ' + context.tenant.branding.primaryColor, padding:16,
        backgroundColor: context.tenant.branding.backgroundColor ?? '#FFFFFF',
        color: context.tenant.branding.primaryColor,
        fontFamily: context.tenant.branding.fontPreset === 'serif' ? 'Georgia,serif'
          : context.tenant.branding.fontPreset === 'rounded' ? 'Trebuchet MS,sans-serif' : 'system-ui,sans-serif',
        borderRadius:12,
      }}>
        <h1>{context.tenant.branding.name}</h1><p>{context.tenant.branding.tagline}</p>
        {context.tenant.branding.accentColor && <div aria-hidden="true" style={{width:120,height:6,borderRadius:6,backgroundColor:context.tenant.branding.accentColor}}/>}
        <p><strong>{context.tenant.status === 'SUSPENDED' ? 'Suspensa' : 'Prévia privada'}</strong></p>
      </header>
        {context.tenant.status === 'SUSPENDED' ? <p>Esta demonstração está suspensa.</p> :
          <section><h2>Cardápio deste tenant</h2>{items.length === 0 && <p>Nenhum produto disponível no momento.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              {items.map((item) => <article key={item.id} style={{ padding: 18, border: '1px solid #999', borderRadius: 8 }}>
                <strong>{item.name}</strong><p>{item.description}</p>
                <p>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.priceCents / 100)}</p>
                <small>Catálogo fictício. Checkout demo disponível somente no Emulator. Nenhum pedido comercial é efetuado.</small>
              </article>)}
            </div>
          </section>}
        <p><a href={`/t/${encodeURIComponent(context.tenant.slug)}/checkout`}>Montar pedido de demonstração</a> (sem cobrança, somente Emulator)</p>
        <p><a href={`/t/${encodeURIComponent(context.tenant.slug)}/reservations`}>Simular reserva de mesa</a> — sem mensagem ou reserva comercial.</p>
        {context.canManageCatalog && <p><a href={`/t/${encodeURIComponent(context.tenant.slug)}/admin`}>Gerenciar catálogo/equipe</a></p>}
        <p><a href="/platform/leads">Voltar à plataforma (Platform Owner)</a></p>
      </>}
  </main>;
}
