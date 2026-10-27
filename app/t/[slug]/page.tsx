'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import type { FoodDemoTenant } from '@/shared/food-platform-domain';

interface FoodPreviewItem { id: string; name: string; description: string; priceCents: number; active: boolean; tenantId: string; }

export default function PrivateFoodDemo({ params }: { params: { slug: string } }) {
  const [tenant, setTenant] = useState<FoodDemoTenant | null>(null);
  const [items, setItems] = useState<FoodPreviewItem[]>([]);
  const [notice, setNotice] = useState('Validando sessão e acesso…');

  useEffect(() => {
    const db = firebaseDb;
    const auth = firebaseAuth;
    if (!db || !auth || !isFirebaseDataMode() || !/^[a-z][a-z0-9-]{2,62}$/.test(params.slug)) {
      setNotice('Demo indisponível neste ambiente.'); return;
    }
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { if (mounted) { setTenant(null); setNotice('Acesse com conta autorizada para visualizar a demo privada.'); } return; }
      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', params.slug));
        if (!tenantDoc.exists()) throw new Error('Tenant ausente.');
        const current = tenantDoc.data() as FoodDemoTenant;
        if (current.kind !== 'DEMO' || current.publiclyListed !== false) throw new Error('Tenant não disponível como demo privada.');
        const snap = await getDocs(collection(db, 'tenants', params.slug, 'menuItems'));
        if (mounted) { setTenant(current); setItems(snap.docs.map((value) => value.data() as FoodPreviewItem).filter((item) => item.active && item.tenantId === params.slug)); setNotice(''); }
      } catch {
        if (mounted) { setTenant(null); setItems([]); setNotice('Sem acesso à demo ou erro ao ler catálogo.'); }
      }
    });
    return () => { mounted = false; unsubscribe(); };
  }, [params.slug]);

  return <main style={{ maxWidth: 900, margin: '2rem auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
    <p><strong>DEMONSTRAÇÃO INTERNA — NÃO É SISTEMA OFICIAL DO ESTABELECIMENTO</strong></p>
    {!tenant ? <p role="status">{notice}</p> : <>
      <header style={{ borderTop: '6px solid ' + tenant.branding.primaryColor, paddingTop: 16 }}>
        <h1>{tenant.branding.name}</h1><p>{tenant.branding.tagline}</p>
      </header>
      {tenant.status === 'SUSPENDED' ? <p>Esta demonstração está suspensa.</p> : <>
        <h2>Catálogo deste tenant</h2>
        {items.length === 0 && <p>Sem produtos cadastrados.</p>}
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {items.map((item) => <article key={item.id} style={{ border: '1px solid #777', padding: 16, borderRadius: 8 }}>
            <h3>{item.name}</h3><p>{item.description}</p>
            <p>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.priceCents / 100)}</p>
          </article>)}
        </div>
        <p><small>Prévia de catálogo. Pedidos e reservas multi-tenant ainda não foram implementados — nenhuma transação comercial ocorre aqui.</small></p>
      </>}
      <p><a href="/platform/leads">Voltar ao painel de leads</a></p>
    </>}
  </main>;
}
