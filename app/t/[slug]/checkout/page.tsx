'use client';

import { useParams } from 'next/navigation';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { firebaseAuth, isFirebaseDataMode } from '@/lib/firebase-client';
import { listFoodTenantMenuItems, resolveFoodTenant } from '@/lib/food-tenant-repository';
import type { FoodTenantContext, FoodTenantMenuItem } from '@/shared/food-tenant-domain';

interface OrderReceipt {
  id: string; tenantId: string; status: string; subtotalCents: number; created: boolean;
  demoOnly: boolean;
}
function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
function usableCart(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([key, value]) => {
    return /^[a-zA-Z0-9_-]{3,100}$/.test(key) && Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 20;
  }).slice(0, 25)) as Record<string, number>;
}

export default function FoodDemoCheckout() {
  const slug = useParams<{ slug: string }>().slug;
  const [ctx, setCtx] = useState<FoodTenantContext | null>(null);
  const [catalog, setCatalog] = useState<FoodTenantMenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('Carregando demonstração…');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const requestId = useRef('');


  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth || !isFirebaseDataMode()) { setNotice('Firebase/Emulator indisponível.'); return; }
    let live = true;
    const stop = onAuthStateChanged(auth, async (user) => {
      if (!live) return;
      setCtx(null); setCatalog([]); setReceipt(null);
      if (!user) { setNotice('Acesso privado: autentique-se para simular um pedido.'); return; }
      try {
        const resolved = await resolveFoodTenant(slug);
        if (resolved.tenant.status !== 'DEMO') throw new Error('Demonstração suspensa.');
        const items = await listFoodTenantMenuItems(resolved);
        if (live) {
          setCtx(resolved);
          setCatalog(items.filter((item) => item.active));
          setNotice('');
          try {
            setCart(usableCart(JSON.parse(window.sessionStorage.getItem('food-demo-cart:' + slug) || '{}')));
          } catch { setCart({}); }
        }
      } catch {
        if (live) setNotice('Acesso negado ou demonstração indisponível.');
      }
    });
    return () => { live = false; stop(); };
  }, [slug]);

  useEffect(() => {
    if (!ctx || typeof window === 'undefined') return;
    try { window.sessionStorage.setItem('food-demo-cart:' + ctx.tenant.id, JSON.stringify(cart)); } catch { /* storage opcional */ }
  }, [cart, ctx]);

  const eligible = useMemo(() => {
    return catalog.filter((item) => (cart[item.id] || 0) > 0).slice(0, 25);
  }, [cart, catalog]);
  const estimate = eligible.reduce((sum, item) => sum + item.priceCents * (cart[item.id] || 0), 0);

  function changeQuantity(id: string, quantity: number) {
    if (busy || receipt) return;
    requestId.current = '';
    setCart((old) => {
      const next = { ...old };
      if (!Number.isInteger(quantity) || quantity < 1) delete next[id];
      else next[id] = Math.min(20, quantity);
      return next;
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ctx || busy || receipt || !eligible.length) return;
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== 'true') {
      setNotice('Checkout de demonstração permitido apenas no ambiente Emulator.');
      return;
    }
    const user = firebaseAuth?.currentUser;
    if (!user) { setNotice('Sessão expirada. Entre novamente.'); return; }
    setBusy(true); setNotice('');
    if (!requestId.current) requestId.current = 'food-demo-' + crypto.randomUUID().replaceAll('-', '');
    try {
      const response = await fetch('/api/t/' + encodeURIComponent(ctx.tenant.id) + '/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await user.getIdToken() },
        body: JSON.stringify({
          clientRequestId: requestId.current,
          items: eligible.map((item) => ({ productId: item.id, quantity: cart[item.id] })),
        }),
      });
      const data = await response.json() as OrderReceipt & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível registrar a simulação. Tente novamente com o mesmo carrinho.');
      }
      if (data.demoOnly !== true || data.tenantId !== ctx.tenant.id || data.id !== requestId.current) {
        throw new Error('Resposta da simulação incompatível com o tenant atual.');
      }
      setReceipt(data);
      setCart({});
      try { window.sessionStorage.removeItem('food-demo-cart:' + ctx.tenant.id); } catch { /* storage opcional */ }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível simular o pedido.');
    } finally { setBusy(false); }
  }

  const shell = { maxWidth: 850, margin: '24px auto', padding: 24, fontFamily: 'system-ui,sans-serif', lineHeight: 1.5 } as const;
  return <main style={shell}>
    <p><strong>SIMULAÇÃO INTERNA — nenhum pagamento, preparo, entrega ou contato com o restaurante</strong></p>
    <h1>Pedido de demonstração</h1>
    <p><a href={'/t/' + encodeURIComponent(slug)}>Voltar ao cardápio privado</a></p>
    {!ctx ? <section role="status"><p>{notice}</p><p><a href={'/t/' + encodeURIComponent(slug) + '/login'}>Entrar</a></p></section> :
      receipt ? <section role="status">
        <h2>Simulação recebida</h2>
        <p>Código: <code>{receipt.id}</code></p>
        <p>Tenant: <code>{receipt.tenantId}</code></p>
        <p>Valor estimado pelo servidor: <strong>{formatBRL(receipt.subtotalCents)}</strong></p>
        <p>Estado: {receipt.status}. Nenhuma cobrança foi criada.</p>
        <button type="button" onClick={() => { requestId.current = ''; setReceipt(null); setNotice(''); }}>Nova simulação</button>
      </section> :
      <form onSubmit={submit}>
        <p>Tenant: <code>{ctx.tenant.id}</code> | Cardápio fictício.</p>
        {catalog.length === 0 && <p>Não há produtos de demonstração disponíveis.</p>}
        <div style={{ display: 'grid', gap: 12 }}>
          {catalog.map((item) => <div key={item.id} style={{ border: '1px solid #999', borderRadius: 8, padding: 14 }}>
            <strong>{item.name}</strong> — {formatBRL(item.priceCents)}
            <p>{item.description}</p>
            <label>Quantidade <input type="number" inputMode="numeric" min={0} max={20} step={1}
              value={cart[item.id] || 0} disabled={busy}
              onChange={(event) => changeQuantity(item.id, Number(event.target.value))} /></label>
          </div>)}
        </div>
        <h2>Subtotal indicativo: {formatBRL(estimate)}</h2>
        <p>O valor definitivo é sempre recalculado no servidor. A simulação não aceita PIX, cartões, endereço ou informações pessoais.</p>
        <button disabled={busy || eligible.length === 0 || ctx.tenant.status !== 'DEMO'} type="submit">
          {busy ? 'Verificando e registrando…' : 'Registrar simulação sem cobrança'}
        </button>
        <p role="alert" aria-live="polite">{notice}</p>
      </form>}
  </main>;
}
