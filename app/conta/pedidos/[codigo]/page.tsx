'use client';

import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, LinkButton, LoadingState } from '@/components/baru-ui';
import { useOrderCart } from '@/components/order-context';
import { PublicLayout } from '@/components/public-shell';
import { newCartItem, readCustomerOrdersAsync, readOrderCatalogAsync } from '@/lib/order-repository';
import { calculateItemPrice, formatOrderMoney, ORDER_STATUS_LABELS, type OrderCatalog, type OrderRecord } from '@/shared/order-domain';
import { watchCustomerAccount } from '@/lib/customer-account';

export default function CustomerOrderDetailPage({ params }: { params: { codigo: string } }) {
  const { addItem } = useOrderCart();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [catalog, setCatalog] = useState<OrderCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; const stop = watchCustomerAccount((account) => { if (!account) { if (active) setLoading(false); return; } Promise.all([readCustomerOrdersAsync(account.uid), readOrderCatalogAsync()]).then(([orders, nextCatalog]) => { if (!active) return; setOrder(orders.find((item) => item.publicCode === params.codigo) || null); setCatalog(nextCatalog); }).finally(() => { if (active) setLoading(false); }); }); return () => { active = false; stop(); }; }, [params.codigo]);
  if (loading) return <PublicLayout><main className="public-section"><LoadingState /></main></PublicLayout>;
  if (!order) return <PublicLayout><main className="public-section empty-state"><h1>Pedido não encontrado</h1><LinkButton href="/conta/pedidos">Voltar aos pedidos</LinkButton></main></PublicLayout>;
  const reorder = () => { if (!catalog) return; let added = 0; for (const item of order.items) { const draft = { ...newCartItem(item.productId, item.sizeId), quantity: item.quantity, notes: item.notes, selections: item.modifierSelections.map((group) => ({ groupId: group.groupId, items: group.items.map((modifier) => ({ modifierId: modifier.modifierId, quantity: modifier.quantity })) })) }; try { calculateItemPrice(draft, catalog); addItem(draft); added += 1; } catch { /* item alterado no catálogo */ } } setMessage(added === order.items.length ? 'Itens adicionados ao carrinho com os preços atuais.' : `${added} de ${order.items.length} itens continuam disponíveis no catálogo.`); };
  return <PublicLayout><main className="public-section"><LinkButton href="/conta/pedidos" variant="ghost"><ArrowLeft size={16} /> Meus pedidos</LinkButton><p className="eyebrow" style={{ marginTop: 22 }}>Pedido {order.orderNumber}</p><h1>{ORDER_STATUS_LABELS[order.status]}</h1><p>{order.statusMessage}</p><section className="settings-card" style={{ marginTop: 22 }}>{order.items.map((item) => <div className="data-row" key={item.cartItemId}><div><strong>{item.quantity}x {item.productName}</strong><div className="table-secondary">{item.sizeLabel} · {item.modifierSelections.flatMap((group) => group.items.map((modifier) => modifier.name)).join(', ')}</div></div><strong>{formatOrderMoney(item.totalPriceCents)}</strong></div>)}<div className="summary-line" style={{ marginTop: 18, fontSize: 20 }}><strong>Total</strong><strong>{formatOrderMoney(order.pricing.totalCents)}</strong></div></section>{message && <p className="field-error" style={{ color: 'var(--success)' }} role="status">{message}</p>}<div className="form-actions" style={{ marginTop: 22 }}><Button onClick={reorder}><RefreshCw size={16} /> Pedir novamente</Button><LinkButton href="/carrinho" variant="secondary">Abrir carrinho</LinkButton></div></main></PublicLayout>;
}
