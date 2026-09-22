'use client';

import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, LinkButton, LoadingState } from '@/components/baru-ui';
import { useOrderCart } from '@/components/order-context';
import { PublicLayout } from '@/components/public-shell';
import { newCartItem, readOrderCart, readOrderCatalogAsync } from '@/lib/order-repository';
import { calculateItemPrice, formatOrderMoney, type CartItemDraft, type OrderCatalog, type OrderModifierGroup } from '@/shared/order-domain';

export default function ProductPage({ params }: { params: { id: string } }) {
  const { addItem, updateItem } = useOrderCart();
  const searchParams = useSearchParams();
  const editingId = searchParams.get('editar');
  const [catalog, setCatalog] = useState<OrderCatalog | null>(null);
  const [draft, setDraft] = useState<CartItemDraft | null>(null);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  useEffect(() => {
    readOrderCatalogAsync().then((next) => {
      setCatalog(next);
      const item = next.items.find((candidate) => candidate.id === params.id);
      if (!item) return;
      const existing = editingId ? readOrderCart().find((candidate) => candidate.cartItemId === editingId && candidate.productId === item.id) : undefined;
      setDraft(existing || newCartItem(item.id, item.sizes?.find((size) => size.active)?.id || 'default'));
    }).catch(() => setError('Não foi possível carregar este item agora.'));
  }, [editingId, params.id]);
  const item = catalog?.items.find((candidate) => candidate.id === params.id);
  const sizes = useMemo(() => item?.sizes?.filter((size) => size.active).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)) || [], [item]);
  const groups = useMemo(() => (item?.modifierGroupIds || []).map((id) => catalog?.groups.find((group) => group.id === id)).filter((group): group is OrderModifierGroup => Boolean(group && group.active)), [catalog, item]);
  const preview = draft && catalog ? (() => { try { return calculateItemPrice(draft, catalog); } catch { return null; } })() : null;
  const updateSelection = (groupId: string, modifierId: string, checked: boolean) => setDraft((current) => {
    if (!current) return current;
    const currentGroup = current.selections.find((selection) => selection.groupId === groupId);
    const items = currentGroup?.items || [];
    const nextItems = checked ? [...items.filter((selection) => selection.modifierId !== modifierId), { modifierId, quantity: 1 }] : items.filter((selection) => selection.modifierId !== modifierId);
    return { ...current, selections: [...current.selections.filter((selection) => selection.groupId !== groupId), { groupId, items: nextItems }] };
  });
  if (!catalog || !draft) return <PublicLayout><main className="public-section"><LoadingState /></main></PublicLayout>;
  if (!item) return <PublicLayout><main className="public-section empty-state"><h1>Item não encontrado</h1><p>Este produto não está disponível no catálogo atual.</p><LinkButton href="/cardapio">Voltar ao cardápio</LinkButton></main></PublicLayout>;
  const add = () => { try { const priced = calculateItemPrice(draft, catalog); if (!priced) throw new Error('Selecione as opções obrigatórias.'); if (editingId) updateItem(draft); else addItem(draft); setAdded(true); setError(''); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Revise as opções do item.'); } };
  return <PublicLayout><main className="public-section"><LinkButton href={editingId ? '/carrinho' : '/cardapio'} variant="ghost"><ArrowLeft size={16} /> {editingId ? 'Voltar ao carrinho' : 'Voltar ao cardápio'}</LinkButton><div className="admin-form-card" style={{ marginTop: 22 }}><section className="form-card"><img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: 270, objectFit: 'cover' }} /><p className="eyebrow" style={{ marginTop: 22 }}>Personalize seu pedido</p><h1>{item.name}</h1><p>{item.description}</p>{sizes.length > 1 && <fieldset className="form-stack"><legend className="form-label">Tamanho</legend>{sizes.map((size) => <label className="settings-card" key={size.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}><input type="radio" name="size" checked={draft.sizeId === size.id} onChange={() => setDraft({ ...draft, sizeId: size.id })} /><span>{size.label}</span><strong style={{ marginLeft: 'auto' }}>{formatOrderMoney(size.basePriceCents)}</strong></label>)}</fieldset>}{groups.map((group) => <fieldset className="form-stack" key={group.id}><legend className="form-label">{group.name}{group.required ? ' *' : ''}</legend>{group.description && <p className="muted">{group.description}</p>}{catalog.modifiers.filter((modifier) => group.modifierIds.includes(modifier.id) && modifier.active && modifier.available).map((modifier) => { const selected = draft.selections.find((selection) => selection.groupId === group.id)?.items.some((selection) => selection.modifierId === modifier.id) || false; return <label className="settings-card" key={modifier.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}><input type={group.maxSelections === 1 ? 'radio' : 'checkbox'} name={group.id} checked={selected} onChange={(event) => updateSelection(group.id, modifier.id, event.target.checked)} /><span>{modifier.name}</span>{modifier.priceCents > 0 && <strong style={{ marginLeft: 'auto' }}>+ {formatOrderMoney(modifier.priceCents)}</strong>}</label>; })}</fieldset>)}<label className="form-label"><span>Observação do item</span><textarea maxLength={300} value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Ex.: sem cebola, ponto da carne…" /></label><div className="form-row"><label className="form-label"><span>Quantidade</span><span className="field-shell"><button type="button" aria-label="Diminuir quantidade" onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })}><Minus size={16} /></button><input value={draft.quantity} readOnly /><button type="button" aria-label="Aumentar quantidade" onClick={() => setDraft({ ...draft, quantity: Math.min(20, draft.quantity + 1) })}><Plus size={16} /></button></span></label><div className="settings-card"><span className="muted">Total do item</span><strong style={{ display: 'block', fontSize: 24, marginTop: 8 }}>{preview ? formatOrderMoney(preview.totalPriceCents) : 'Revise as opções'}</strong></div></div>{error && <p className="field-error" role="alert">{error}</p>}{added && <p className="field-error" style={{ color: 'var(--success)' }} role="status"><Check size={16} /> {editingId ? 'Item atualizado no carrinho.' : 'Item adicionado ao carrinho.'}</p>}<div className="form-actions"><Button type="button" onClick={add}><ShoppingBag size={16} /> {editingId ? 'Atualizar carrinho' : 'Adicionar ao carrinho'}</Button>{added && <LinkButton href="/carrinho" variant="secondary">Ver carrinho</LinkButton>}</div></section></div></main></PublicLayout>;
}
