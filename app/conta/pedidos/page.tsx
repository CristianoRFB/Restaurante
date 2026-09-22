'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState, LinkButton, LoadingState } from '@/components/baru-ui';
import { PublicLayout } from '@/components/public-shell';
import { readCustomerOrdersAsync } from '@/lib/order-repository';
import { formatOrderMoney, ORDER_STATUS_LABELS, type OrderRecord } from '@/shared/order-domain';
import { watchCustomerAccount } from '@/lib/customer-account';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; const stop = watchCustomerAccount((account) => { if (!account) { if (active) setReady(true); return; } readCustomerOrdersAsync(account.uid).then((next) => { if (active) setOrders(next); }).catch(() => { if (active) setError('Não foi possível carregar seus pedidos.'); }).finally(() => { if (active) setReady(true); }); }); return () => { active = false; stop(); }; }, []);
  if (!ready) return <PublicLayout><main className="public-section"><LoadingState /></main></PublicLayout>;
  if (error) return <PublicLayout><main className="public-section"><p className="field-error" role="alert">{error}</p></main></PublicLayout>;
  if (!orders.length) return <PublicLayout><main className="public-section"><EmptyState title="Você ainda não tem pedidos" description="Faça seu primeiro pedido dentro do cardápio do Baru." /><div className="form-actions" style={{ justifyContent: 'center' }}><LinkButton href="/cardapio">Ver cardápio</LinkButton><LinkButton href="/conta" variant="ghost">Voltar à conta</LinkButton></div></main></PublicLayout>;
  return <PublicLayout><main className="public-section"><div className="section-heading"><div><p className="eyebrow">Área do cliente</p><h1>Meus pedidos</h1><p>Acompanhe pedidos internos e peça novamente quando quiser.</p></div><LinkButton href="/cardapio"><ShoppingBag size={16} /> Novo pedido</LinkButton></div><div className="card-grid" style={{ marginTop: 22 }}>{orders.map((order) => <article className="settings-card" key={order.id}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><p className="eyebrow">{order.orderNumber}</p><h2>{ORDER_STATUS_LABELS[order.status]}</h2></div><strong>{formatOrderMoney(order.pricing.totalCents)}</strong></div><p>{order.items.reduce((total, item) => total + item.quantity, 0)} itens · {order.fulfillment.mode === 'DELIVERY' ? 'Entrega' : order.fulfillment.mode === 'PICKUP' ? 'Retirada' : 'Consumo no local'}</p><LinkButton href={`/conta/pedidos/${order.publicCode}`} variant="ghost">Abrir pedido <ArrowRight size={15} /></LinkButton></article>)}</div></main></PublicLayout>;
}
