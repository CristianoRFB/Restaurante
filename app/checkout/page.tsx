'use client';

import { ArrowLeft, Bike, CreditCard, MapPin, Store, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button, LinkButton, LoadingState } from '@/components/baru-ui';
import { useOrderCart } from '@/components/order-context';
import { PublicLayout } from '@/components/public-shell';
import { createClientRequestId, createOrderAsync, defaultOrderSettings, readOrderCatalogAsync, readOrderSettingsAsync } from '@/lib/order-repository';
import { readSettingsAsync } from '@/lib/baru-repository';
import { calculateCartPreview, formatOrderMoney, type FulfillmentMode, type OrderCatalog, type OrderOperationsSettings, type PaymentMethod } from '@/shared/order-domain';
import type { RestaurantSettings } from '@/shared/baru-domain';

const paymentLabels: Record<PaymentMethod, string> = { PIX: 'Pix', CARD_ON_DELIVERY: 'Cartão na entrega/retirada', CASH: 'Dinheiro' };
const fulfillmentLabels: Record<FulfillmentMode, string> = { PICKUP: 'Retirar no Baru', DELIVERY: 'Receber em casa', DINE_IN: 'Consumir no local' };

export default function CheckoutPage() {
  const { items, clear } = useOrderCart();
  const [catalog, setCatalog] = useState<OrderCatalog | null>(null);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [orderSettings, setOrderSettings] = useState<OrderOperationsSettings>(defaultOrderSettings);
  const [fields, setFields] = useState({ name: '', whatsapp: '', email: '', street: '', number: '', complement: '', neighborhood: '', reference: '', notes: '', changeFor: '', promoCode: '', zoneId: '', tableId: '' });
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>('PICKUP');
  const [payment, setPayment] = useState<PaymentMethod>('PIX');
  const [needsChange, setNeedsChange] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([readOrderCatalogAsync(), readSettingsAsync(), readOrderSettingsAsync()]).then(([nextCatalog, nextSettings, nextOrderSettings]) => {
      setCatalog(nextCatalog); setSettings(nextSettings); setOrderSettings(nextOrderSettings);
      setFulfillment((current) => nextOrderSettings.fulfillmentModes.includes(current) ? current : nextOrderSettings.fulfillmentModes[0]);
      setPayment((current) => nextOrderSettings.paymentMethods.includes(current) ? current : nextOrderSettings.paymentMethods[0]);
    }).catch(() => setError('Não foi possível carregar o checkout.'));
  }, []);

  const fulfillmentModes = orderSettings.fulfillmentModes;
  const paymentMethods = orderSettings.paymentMethods;
  const activeZones = orderSettings.deliveryZones.filter((zone) => zone.active);
  const selectedZone = activeZones.find((zone) => zone.id === fields.zoneId);
  const preview = useMemo(() => {
    if (!catalog || !items.length) return null;
    try { return calculateCartPreview(items, catalog); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Revise os itens do carrinho.'); return null; }
  }, [catalog, items]);
  const deliveryFee = fulfillment === 'DELIVERY' ? Number(selectedZone?.feeCents ?? orderSettings.deliveryFeeCents ?? 0) : 0;
  const total = (preview?.subtotalCents || 0) + deliveryFee;
  const update = (key: keyof typeof fields, value: string) => setFields((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!preview || submitting) return; setSubmitting(true); setError('');
    try {
      let clientRequestId = '';
      try { clientRequestId = sessionStorage.getItem('baru-order-request-id') || ''; } catch { /* armazenamento opcional */ }
      if (!clientRequestId) { clientRequestId = createClientRequestId(); try { sessionStorage.setItem('baru-order-request-id', clientRequestId); } catch { /* armazenamento opcional */ } }
      const result = await createOrderAsync({ clientRequestId, customer: { name: fields.name, whatsapp: fields.whatsapp, ...(fields.email ? { email: fields.email } : {}) }, items, fulfillment: { mode: fulfillment, ...(fulfillment === 'DELIVERY' ? { address: { street: fields.street, number: fields.number, complement: fields.complement, neighborhood: fields.neighborhood, reference: fields.reference }, ...(fields.zoneId ? { zoneId: fields.zoneId } : {}) } : {}), ...(fulfillment === 'DINE_IN' && fields.tableId ? { tableId: fields.tableId } : {}) }, payment: { method: payment, needsChange, ...(needsChange ? { changeForCents: Math.round(Number(fields.changeFor.replace(',', '.')) * 100) } : {}) }, notes: fields.notes, ...(fields.promoCode.trim() ? { promoCode: fields.promoCode.trim() } : {}) });
      clear(); try { sessionStorage.removeItem('baru-order-request-id'); } catch { /* armazenamento opcional */ } window.location.href = `/pedido/${result.publicCode}`;
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível criar o pedido.'); setSubmitting(false); }
  };

  if (!catalog || !settings) return <PublicLayout><main className="public-section"><LoadingState /></main></PublicLayout>;
  if (!items.length || !preview) return <PublicLayout><main className="public-section empty-state"><h1>Carrinho vazio</h1><p>Adicione um item antes de finalizar.</p><LinkButton href="/cardapio">Voltar ao cardápio</LinkButton></main></PublicLayout>;
  return <PublicLayout><main className="public-section"><LinkButton href="/carrinho" variant="ghost"><ArrowLeft size={16} /> Voltar ao carrinho</LinkButton><div className="section-heading" style={{ marginTop: 22 }}><div><p className="eyebrow">Pedido interno Baru</p><h1>Finalizar pedido</h1><p>O pedido será criado no Firebase e acompanhado pelo código gerado.</p></div></div>{orderSettings.acceptingOrders === false && <p className="field-error" role="alert">{orderSettings.pauseMessage || 'Os pedidos estão pausados no momento.'}</p>}<form className="admin-form-card" onSubmit={submit}><section className="form-card"><h2>Seus dados</h2><div className="form-row"><label className="form-label"><span>Nome *</span><input value={fields.name} onChange={(event) => update('name', event.target.value)} minLength={2} maxLength={100} required /></label><label className="form-label"><span>WhatsApp *</span><input value={fields.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} inputMode="tel" maxLength={20} required /></label></div><label className="form-label"><span>E-mail (opcional)</span><input type="email" value={fields.email} onChange={(event) => update('email', event.target.value)} maxLength={320} /></label><h2 style={{ marginTop: 28 }}>Como receber</h2><div className="card-grid">{fulfillmentModes.map((mode) => <button type="button" key={mode} aria-pressed={fulfillment === mode} onClick={() => setFulfillment(mode)} className={`settings-card ${fulfillment === mode ? 'active' : ''}`}><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{mode === 'PICKUP' ? <Store size={18} /> : mode === 'DELIVERY' ? <Bike size={18} /> : <MapPin size={18} />}<strong>{fulfillmentLabels[mode]}</strong></span></button>)}</div>{fulfillment === 'DELIVERY' && <div className="form-stack" style={{ marginTop: 18 }}>{activeZones.length > 0 && <label className="form-label"><span>Zona de entrega *</span><select value={fields.zoneId} onChange={(event) => update('zoneId', event.target.value)} required><option value="">Selecione sua região</option>{activeZones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name} · {formatOrderMoney(zone.feeCents)}</option>)}</select></label>}<div className="form-row"><label className="form-label"><span>Rua *</span><input value={fields.street} onChange={(event) => update('street', event.target.value)} maxLength={120} required /></label><label className="form-label"><span>Número *</span><input value={fields.number} onChange={(event) => update('number', event.target.value)} maxLength={20} required /></label></div><div className="form-row"><label className="form-label"><span>Bairro *</span><input value={fields.neighborhood} onChange={(event) => update('neighborhood', event.target.value)} maxLength={80} required /></label><label className="form-label"><span>Complemento</span><input value={fields.complement} onChange={(event) => update('complement', event.target.value)} maxLength={80} /></label></div><label className="form-label"><span>Referência</span><input value={fields.reference} onChange={(event) => update('reference', event.target.value)} maxLength={120} /></label></div>}{fulfillment === 'DINE_IN' && <label className="form-label" style={{ marginTop: 16 }}><span>Mesa *</span><input value={fields.tableId} onChange={(event) => update('tableId', event.target.value)} placeholder="Ex.: mesa-sala-01" maxLength={120} required /><small className="muted">Informe o código impresso na mesa ou lido pelo QR.</small></label>}<h2 style={{ marginTop: 28 }}>Pagamento</h2><div className="card-grid">{paymentMethods.map((method) => <button type="button" key={method} aria-pressed={payment === method} onClick={() => setPayment(method)} className={`settings-card ${payment === method ? 'active' : ''}`}><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{method === 'PIX' ? <Wallet size={18} /> : <CreditCard size={18} />}<strong>{paymentLabels[method]}</strong></span>{method === 'PIX' && <small className="muted">As instruções aparecem após a confirmação da loja.</small>}</button>)}</div>{payment === 'CASH' && <div className="form-row" style={{ marginTop: 18 }}><label className="form-label"><span>Precisa de troco?</span><select value={needsChange ? 'yes' : 'no'} onChange={(event) => setNeedsChange(event.target.value === 'yes')}><option value="no">Não</option><option value="yes">Sim</option></select></label>{needsChange && <label className="form-label"><span>Troco para (R$) *</span><input value={fields.changeFor} onChange={(event) => update('changeFor', event.target.value)} inputMode="decimal" required /></label>}</div>}<div className="form-row" style={{ marginTop: 18 }}><label className="form-label"><span>Cupom (opcional)</span><input value={fields.promoCode} onChange={(event) => update('promoCode', event.target.value.toUpperCase())} maxLength={40} placeholder="Ex.: BEMVINDO10" /></label><p className="muted" style={{ alignSelf: 'end' }}>O desconto é validado e recalculado no servidor.</p></div><label className="form-label" style={{ marginTop: 18 }}><span>Observação geral</span><textarea value={fields.notes} onChange={(event) => update('notes', event.target.value)} maxLength={500} /></label>{error && <p className="field-error" role="alert">{error}</p>}<div className="form-actions"><Button type="submit" disabled={submitting || orderSettings.acceptingOrders === false}>{submitting ? 'Criando pedido…' : 'Confirmar pedido'}</Button><LinkButton href="/carrinho" variant="ghost">Revisar carrinho</LinkButton></div></section><aside className="side-summary"><h2>Resumo</h2>{preview.items.map((item) => <div className="summary-line" key={item.cartItemId}><span>{item.quantity}x {item.productName}</span><strong>{formatOrderMoney(item.totalPriceCents)}</strong></div>)}<hr /><div className="summary-line"><span>Subtotal</span><strong>{formatOrderMoney(preview.subtotalCents)}</strong></div><div className="summary-line"><span>Entrega</span><strong>{deliveryFee ? formatOrderMoney(deliveryFee) : 'A confirmar/configurar'}</strong></div><div className="summary-line" style={{ marginTop: 18, fontSize: 20 }}><strong>Total antes do cupom</strong><strong>{formatOrderMoney(total)}</strong></div><p className="muted" style={{ marginTop: 18 }}>O valor final, incluindo cupom, é recalculado no servidor.</p></aside></form></main></PublicLayout>;
}
