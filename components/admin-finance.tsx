'use client';

import { BarChart3, CreditCard, WalletCards } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '@/components/admin-shell';
import { Button, LoadingState } from '@/components/baru-ui';
import { firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import { formatMoney } from '@/shared/baru-domain';
import type { OrderRecord, PaymentMethod } from '@/shared/order-domain';

const paymentLabels: Record<PaymentMethod, string> = { PIX: 'Pix', CARD_ON_DELIVERY: 'Cartão na entrega/retirada', CASH: 'Dinheiro' };

export function FinanceManagerView() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { if (!isFirebaseDataMode() || !firebaseDb) { setLoading(false); return; } try { const snapshot = await getDocs(collection(firebaseDb, 'orders')); setOrders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderRecord)); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os pedidos financeiros.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const completed = orders.filter((order) => order.status === 'COMPLETED');
  const total = completed.reduce((sum, order) => sum + order.pricing.totalCents, 0);
  const payments = useMemo(() => (['PIX', 'CARD_ON_DELIVERY', 'CASH'] as PaymentMethod[]).map((method) => ({ method, amount: completed.filter((order) => order.payment.method === method).reduce((sum, order) => sum + order.pricing.totalCents, 0) })), [completed]);
  if (loading) return <AdminPage active="/admin/financas" title="Finanças" subtitle="Carregando dados reais."><LoadingState /></AdminPage>;
  return <AdminPage active="/admin/financas" title="Finanças" subtitle="Receita de pedidos concluídos no Baru." actions={<Button variant="ghost" onClick={load}>Atualizar</Button>}>
    {!isFirebaseDataMode() && <p className="field-error" role="alert">O modo demo não exibe números financeiros de operação.</p>}{error && <p className="field-error" role="alert">{error}</p>}
    <div className="admin-grid"><article className="settings-card"><BarChart3 color="var(--terracotta)" /><p>Receita concluída</p><strong>{formatMoney(total)}</strong></article><article className="settings-card"><WalletCards color="var(--terracotta)" /><p>Pedidos concluídos</p><strong>{completed.length}</strong></article><article className="settings-card"><CreditCard color="var(--terracotta)" /><p>Ticket médio</p><strong>{formatMoney(completed.length ? Math.round(total / completed.length) : 0)}</strong></article></div>
    <section className="admin-panel" style={{ marginTop: 18 }}><header className="admin-panel__header"><h2>Receita por pagamento</h2><span className="muted">Somente pedidos internos concluídos</span></header><div className="admin-panel__body"><div className="card-grid">{payments.map(({ method, amount }) => <article className="settings-card" key={method}><p>{paymentLabels[method]}</p><strong>{formatMoney(amount)}</strong></article>)}</div></div></section>
    <section className="admin-panel" style={{ marginTop: 18 }}><header className="admin-panel__header"><h2>Pedidos que compõem a receita</h2></header><div className="admin-panel__body"><div className="data-list">{completed.slice(0, 50).map((order) => <div className="data-row" key={order.id}><div><strong>{order.orderNumber}</strong><div className="table-secondary">{order.customer.name} · {paymentLabels[order.payment.method]}</div></div><strong>{formatMoney(order.pricing.totalCents)}</strong></div>)}{!completed.length && <p className="muted">Nenhum pedido concluído ainda.</p>}</div></div></section>
  </AdminPage>;
}
