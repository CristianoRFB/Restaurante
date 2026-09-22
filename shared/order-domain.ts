import type { MenuItem } from '@/shared/baru-domain';

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
export type FulfillmentMode = 'PICKUP' | 'DELIVERY' | 'DINE_IN';
export type PaymentMethod = 'PIX' | 'CARD_ON_DELIVERY' | 'CASH';

export function sanitizeTableId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^(?:table|mesa)-[a-z0-9-]{2,120}$/i.test(normalized) ? normalized : null;
}

export type PromotionDiscountType = 'PERCENT' | 'FIXED';

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  minOrderCents: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  displayOrder: number;
}

export interface OrderOperationsSettings {
  acceptingOrders: boolean;
  pauseMessage: string;
  fulfillmentModes: FulfillmentMode[];
  paymentMethods: PaymentMethod[];
  deliveryFeeCents: number;
  minimumOrderCents: number;
  orderEstimateMinutes: number;
  deliveryZones: DeliveryZone[];
}

export interface DeliveryZone { id: string; name: string; feeCents: number; active: boolean; }

export interface OrderSize {
  id: string;
  label: string;
  basePriceCents: number;
  active: boolean;
  displayOrder?: number;
}

export interface OrderModifier {
  id: string;
  name: string;
  active: boolean;
  available: boolean;
  priceCents: number;
  maxQuantity?: number;
  displayOrder?: number;
}

export interface OrderModifierGroup {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  allowDuplicate: boolean;
  maxPerModifier?: number;
  modifierIds: string[];
  displayOrder?: number;
}

export interface OrderCatalogItem extends MenuItem {
  sizes?: OrderSize[];
  modifierGroupIds?: string[];
}

export interface OrderCatalog {
  items: OrderCatalogItem[];
  groups: OrderModifierGroup[];
  modifiers: OrderModifier[];
}

export interface ModifierSelection { modifierId: string; quantity: number }
export interface GroupSelection { groupId: string; items: ModifierSelection[] }
export interface CartItemDraft {
  cartItemId: string;
  productId: string;
  sizeId: string;
  selections: GroupSelection[];
  quantity: number;
  notes?: string;
}

export interface PricedModifierSelection extends ModifierSelection {
  name: string;
  unitChargeCents: number;
  totalChargeCents: number;
}
export interface PricedGroupSelection { groupId: string; groupName: string; items: PricedModifierSelection[] }
export interface PricedItem {
  cartItemId: string;
  productId: string;
  productName: string;
  imageUrl: string;
  sizeId: string;
  sizeLabel: string;
  quantity: number;
  modifierSelections: PricedGroupSelection[];
  unitPriceCents: number;
  totalPriceCents: number;
  notes?: string;
}

export interface CartPreview { items: PricedItem[]; subtotalCents: number }

export interface PublicOrder {
  publicCode: string;
  orderNumber: string;
  items: PricedItem[];
  pricing: { subtotalCents: number; deliveryFeeCents: number; discountCents: number; totalCents: number };
  fulfillment: { mode: FulfillmentMode };
  payment: { method: PaymentMethod };
  status: OrderStatus;
  statusMessage: string;
  estimatedMinutes: number;
  history: Array<{ status: OrderStatus; label: string; at: unknown }>;
  createdAt: unknown;
  updatedAt: unknown;
  promotion?: { code: string; title: string };
}

export interface OrderRecord extends PublicOrder {
  id: string;
  customerAccountUid?: string;
  customer: { name: string; whatsapp: string; email?: string; address?: { street: string; number: string; complement?: string; neighborhood: string; reference?: string } };
  notes: string;
  source: 'SITE' | 'ADMIN';
  clientRequestId: string;
}

export interface OrderNotification {
  id: string;
  type: 'NEW_ORDER';
  orderId: string;
  orderNumber: string;
  publicCode: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: unknown;
}

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Novo',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export function formatOrderMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function safeInteger(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function normalizedSelections(selections: GroupSelection[]): GroupSelection[] {
  const groups = new Map<string, Map<string, number>>();
  for (const selection of Array.isArray(selections) ? selections : []) {
    if (typeof selection?.groupId !== 'string') continue;
    const modifiers = groups.get(selection.groupId) ?? new Map<string, number>();
    for (const item of Array.isArray(selection.items) ? selection.items : []) {
      if (typeof item?.modifierId !== 'string' || !safeInteger(item.quantity, 1, 20)) continue;
      modifiers.set(item.modifierId, (modifiers.get(item.modifierId) || 0) + item.quantity);
    }
    groups.set(selection.groupId, modifiers);
  }
  return [...groups.entries()].map(([groupId, items]) => ({ groupId, items: [...items.entries()].map(([modifierId, quantity]) => ({ modifierId, quantity })) })).sort((a, b) => a.groupId.localeCompare(b.groupId));
}

function effectiveSize(item: OrderCatalogItem, sizeId: string): OrderSize | null {
  const sizes = Array.isArray(item.sizes) && item.sizes.length ? item.sizes : [{ id: 'default', label: 'Porção', basePriceCents: item.priceCents, active: item.active }];
  return sizes.find((size) => size.id === sizeId && size.active) || null;
}

function validateGroup(group: OrderModifierGroup, selection: GroupSelection | undefined, modifiers: Map<string, OrderModifier>): void {
  const items = selection?.items || [];
  const count = items.reduce((total, item) => total + item.quantity, 0);
  if (group.required && count === 0) throw new Error(`Escolha pelo menos uma opção em ${group.name}.`);
  if (count < group.minSelections) throw new Error(`Escolha pelo menos ${group.minSelections} opção(ões) em ${group.name}.`);
  if (count > group.maxSelections) throw new Error(`Escolha no máximo ${group.maxSelections} opção(ões) em ${group.name}.`);
  for (const item of items) {
    const modifier = modifiers.get(item.modifierId);
    if (!modifier || !group.modifierIds.includes(item.modifierId) || !modifier.active || !modifier.available) throw new Error('O adicional selecionado não está disponível.');
    const max = Math.min(group.maxPerModifier ?? 20, modifier.maxQuantity ?? 20);
    if (!group.allowDuplicate && item.quantity > 1) throw new Error(`Não é possível repetir ${modifier.name}.`);
    if (!safeInteger(item.quantity, 1, max)) throw new Error(`Quantidade inválida para ${modifier.name}.`);
    if (!safeInteger(modifier.priceCents, 0, 1_000_000)) throw new Error('Preço de adicional inválido.');
  }
}

export function calculateItemPrice(draft: CartItemDraft, catalog: OrderCatalog): PricedItem {
  if (!draft || typeof draft.productId !== 'string' || !safeInteger(draft.quantity, 1, 20)) throw new Error('Item ou quantidade inválida.');
  const item = catalog.items.find((candidate) => candidate.id === draft.productId && candidate.active);
  if (!item) throw new Error('Produto indisponível.');
  const size = effectiveSize(item, draft.sizeId || 'default');
  if (!size || !safeInteger(size.basePriceCents, 0, 10_000_000)) throw new Error('Tamanho indisponível.');
  const groups = new Map(catalog.groups.filter((group) => group.active).map((group) => [group.id, group]));
  const modifiers = new Map(catalog.modifiers.map((modifier) => [modifier.id, modifier]));
  const selections = normalizedSelections(draft.selections);
  const selectionMap = new Map(selections.map((selection) => [selection.groupId, selection]));
  const pricedGroups: PricedGroupSelection[] = [];
  let modifierTotal = 0;
  for (const groupId of item.modifierGroupIds || []) {
    const group = groups.get(groupId);
    if (!group) throw new Error('A configuração de adicionais deste produto está indisponível.');
    validateGroup(group, selectionMap.get(group.id), modifiers);
    const pricedItems = (selectionMap.get(group.id)?.items || []).map((selection) => {
      const modifier = modifiers.get(selection.modifierId)!;
      const totalChargeCents = modifier.priceCents * selection.quantity;
      modifierTotal += totalChargeCents;
      return { ...selection, name: modifier.name, unitChargeCents: modifier.priceCents, totalChargeCents };
    });
    pricedGroups.push({ groupId: group.id, groupName: group.name, items: pricedItems });
  }
  if (selections.some((selection) => !(item.modifierGroupIds || []).includes(selection.groupId))) throw new Error('Grupo de adicionais inválido.');
  const unitPriceCents = size.basePriceCents + modifierTotal;
  const totalPriceCents = unitPriceCents * draft.quantity;
  if (!safeInteger(unitPriceCents, 0, 10_000_000) || !safeInteger(totalPriceCents, 0, 10_000_000)) throw new Error('Total do item ultrapassa o limite permitido.');
  const notes = typeof draft.notes === 'string' ? draft.notes.trim().slice(0, 300) : '';
  return { cartItemId: draft.cartItemId, productId: item.id, productName: item.name, imageUrl: item.imageUrl, sizeId: size.id, sizeLabel: size.label, quantity: draft.quantity, modifierSelections: pricedGroups, unitPriceCents, totalPriceCents, ...(notes ? { notes } : {}) };
}

export function calculateCartPreview(items: CartItemDraft[], catalog: OrderCatalog): CartPreview {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) throw new Error('Adicione pelo menos um item ao pedido.');
  const pricedItems = items.map((item) => calculateItemPrice(item, catalog));
  const subtotalCents = pricedItems.reduce((total, item) => total + item.totalPriceCents, 0);
  if (!safeInteger(subtotalCents, 1, 10_000_000)) throw new Error('Total do pedido inválido.');
  return { items: pricedItems, subtotalCents };
}

export function getOrderStatusMessage(status: OrderStatus): string {
  return status === 'NEW' ? 'Pedido recebido. A loja vai confirmar em instantes.' : status === 'CONFIRMED' ? 'Pedido confirmado pela loja.' : status === 'PREPARING' ? 'Seu pedido está em preparo.' : status === 'READY' ? 'Seu pedido está pronto.' : status === 'OUT_FOR_DELIVERY' ? 'Seu pedido saiu para entrega.' : status === 'COMPLETED' ? 'Pedido concluído. Obrigado!' : 'Pedido cancelado pela loja.';
}
