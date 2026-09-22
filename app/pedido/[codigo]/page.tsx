'use client';

import { Check, Clock3, Home, PackageCheck, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CopyButton, LinkButton, LoadingState } from '@/components/baru-ui';
import { PublicLayout } from '@/components/public-shell';
import { watchPublicOrder } from '@/lib/order-repository';
import { formatOrderMoney, ORDER_STATUS_LABELS, type OrderStatus, type PublicOrder } from '@/shared/order-domain';

const timeline: OrderStatus[] = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];

export default function OrderTrackingPage({ params }: { params: { codigo: string } }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const unsubscribe = watchPublicOrder(params.codigo, (next) => { setOrder(next); setLoading(false); }); return () => unsubscribe(); }, [params.codigo]);
  if (loading) return <PublicLayout><main className="public-section"><LoadingState /></main></PublicLayout>;
  if (!order) return <PublicLayout><main className="public-section empty-state"><h1>Pedido não encontrado</h1><p>Confira o código recebido ou volte ao cardápio.</p><LinkButton href="/cardapio">Voltar ao cardápio</LinkButton></main></PublicLayout>;
  const currentIndex = timeline.indexOf(order.status);
  return <PublicLayout><main className="public-section"><p className="eyebrow">Acompanhamento em tempo real</p><h1>Pedido {order.orderNumber}</h1><p>{order.statusMessage}</p><div className="code-panel" style={{ marginTop: 22 }}><div><small>Código público</small><strong>{order.publicCode}</strong></div><CopyButton value={order.publicCode} /></div><section className="settings-card" style={{ marginTop: 22 }}><div className="timeline">{timeline.map((status, index) => { const done = currentIndex >= index && order.status !== 'CANCELLED'; return <div className="timeline-item" key={status} style={{ opacity: done ? 1 : 0.45 }}><strong>{done ? <Check size={15} /> : <Clock3 size={15} />} {ORDER_STATUS_LABELS[status]}</strong>{status === order.status && <span>{order.statusMessage}</span>}</div>; })}{order.status === 'CANCELLED' && <div className="timeline-item"><strong>Pedido cancelado</strong><span>{order.statusMessage}</span></div>}</div></section><div className="admin-two-col" style={{ marginTop: 22 }}><section className="admin-panel"><header className="admin-panel__header"><h2>Itens</h2><span className="muted">Pedido interno</span></header><div className="admin-panel__body">{order.items.map((item) => <div className="data-row" key={item.cartItemId}><div><strong>{item.quantity}x {item.productName}</strong><div className="table-secondary">{item.sizeLabel}{item.modifierSelections.filter((group) => group.items.length).map((group) => ` · ${group.groupName}: ${group.items.map((modifier) => modifier.name).join(', ')}`).join('')}</div></div><strong>{formatOrderMoney(item.totalPriceCents)}</strong></div>)}</div></section><aside className="side-summary"><h2>Resumo</h2><div className="summary-line"><span>Recebimento</span><strong>{order.fulfillment.mode === 'PICKUP' ? 'Retirada' : order.fulfillment.mode === 'DELIVERY' ? 'Entrega' : 'Consumo no local'}</strong></div><div className="summary-line"><span>Pagamento</span><strong>{order.payment.method === 'PIX' ? 'Pix' : order.payment.method === 'CASH' ? 'Dinheiro' : 'Cartão'}</strong></div><div className="summary-line" style={{ marginTop: 18, fontSize: 20 }}><strong>Total</strong><strong>{formatOrderMoney(order.pricing.totalCents)}</strong></div><p className="muted" style={{ marginTop: 16 }}><PackageCheck size={16} /> Estimativa: {order.estimatedMinutes} minutos</p></aside></div><div className="form-actions" style={{ marginTop: 22 }}><LinkButton href="/cardapio" variant="secondary"><Truck size={15} /> Fazer novo pedido</LinkButton><LinkButton href="/" variant="ghost"><Home size={15} /> Início</LinkButton></div></main></PublicLayout>;
}
