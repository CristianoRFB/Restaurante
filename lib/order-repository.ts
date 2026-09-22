import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import { categories as demoCategories, menuItems as demoItems } from '@/lib/baru-data';
import type { MenuCategory, MenuItem } from '@/shared/baru-domain';
import { getOrderStatusMessage, ORDER_TRANSITIONS, type CartItemDraft, type OrderCatalog, type OrderModifier, type OrderModifierGroup, type OrderNotification, type OrderOperationsSettings, type OrderRecord, type OrderStatus, type PublicOrder } from '@/shared/order-domain';

const CART_KEY = 'baru-order-cart-v1';
export const defaultOrderSettings: OrderOperationsSettings = { acceptingOrders: true, pauseMessage: 'Os pedidos estão pausados no momento.', fulfillmentModes: ['PICKUP'], paymentMethods: ['PIX', 'CARD_ON_DELIVERY', 'CASH'], deliveryFeeCents: 0, minimumOrderCents: 0, orderEstimateMinutes: 30, deliveryZones: [] };

function randomId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeCart(value: unknown): CartItemDraft[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Partial<CartItemDraft>;
    if (typeof raw.productId !== 'string' || raw.productId.length > 120 || typeof raw.sizeId !== 'string') return [];
    const quantity = Number(raw.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) return [];
    const selections = Array.isArray(raw.selections) ? raw.selections.slice(0, 20).flatMap((group) => {
      if (!group || typeof group !== 'object' || typeof group.groupId !== 'string' || !Array.isArray(group.items)) return [];
      const items = group.items.slice(0, 20).flatMap((selection) => {
        if (!selection || typeof selection !== 'object' || typeof selection.modifierId !== 'string') return [];
        const selectionQuantity = Number(selection.quantity);
        return Number.isSafeInteger(selectionQuantity) && selectionQuantity >= 1 && selectionQuantity <= 20 ? [{ modifierId: selection.modifierId.slice(0, 120), quantity: selectionQuantity }] : [];
      });
      return [{ groupId: group.groupId.slice(0, 120), items }];
    }) : [];
    return [{ cartItemId: typeof raw.cartItemId === 'string' ? raw.cartItemId.slice(0, 120) : randomId(), productId: raw.productId.slice(0, 120), sizeId: raw.sizeId.slice(0, 120), selections, quantity, ...(typeof raw.notes === 'string' && raw.notes.trim() ? { notes: raw.notes.trim().slice(0, 300) } : {}) }];
  });
}

export function readOrderCart(): CartItemDraft[] {
  if (typeof window === 'undefined') return [];
  try { return sanitizeCart(JSON.parse(window.localStorage.getItem(CART_KEY) || '[]')); } catch { return []; }
}

export function writeOrderCart(items: CartItemDraft[]): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CART_KEY, JSON.stringify(sanitizeCart(items))); } catch { /* armazenamento opcional */ }
}

export function newCartItem(productId: string, sizeId = 'default'): CartItemDraft {
  return { cartItemId: randomId(), productId, sizeId, selections: [], quantity: 1 };
}

async function readCollection<T>(name: string, fallback: T[]): Promise<T[]> {
  if (!isFirebaseDataMode() || !firebaseDb) return fallback.map((item) => ({ ...item }));
  const snapshot = await getDocs(collection(firebaseDb, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function readOrderCatalogAsync(): Promise<OrderCatalog> {
  const [items, groups, modifiers] = await Promise.all([
    readCollection<MenuItem>('menuItems', demoItems),
    readCollection<OrderModifierGroup>('modifierGroups', []),
    readCollection<OrderModifier>('modifiers', []),
  ]);
  return { items: items.filter((item) => item.active) as OrderCatalog['items'], groups: groups.filter((group) => group.active), modifiers: modifiers.filter((modifier) => modifier.active) };
}

export async function readOrderSettingsAsync(): Promise<OrderOperationsSettings> {
  if (!isFirebaseDataMode() || !firebaseDb) return { ...defaultOrderSettings, fulfillmentModes: [...defaultOrderSettings.fulfillmentModes], paymentMethods: [...defaultOrderSettings.paymentMethods] };
  const snapshot = await getDoc(doc(firebaseDb, 'orderSettings', 'main'));
  if (!snapshot.exists()) return { ...defaultOrderSettings, fulfillmentModes: [...defaultOrderSettings.fulfillmentModes], paymentMethods: [...defaultOrderSettings.paymentMethods] };
  return { ...defaultOrderSettings, ...snapshot.data(), fulfillmentModes: (snapshot.data().fulfillmentModes || defaultOrderSettings.fulfillmentModes) as OrderOperationsSettings['fulfillmentModes'], paymentMethods: (snapshot.data().paymentMethods || defaultOrderSettings.paymentMethods) as OrderOperationsSettings['paymentMethods'], deliveryZones: Array.isArray(snapshot.data().deliveryZones) ? snapshot.data().deliveryZones as OrderOperationsSettings['deliveryZones'] : [] };
}

export async function saveOrderSettingsAsync(value: OrderOperationsSettings): Promise<void> {
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('O Firebase real é necessário para configurar pedidos.');
  if (!value.fulfillmentModes.length || !value.paymentMethods.length || value.pauseMessage.trim().length > 240 || !Number.isSafeInteger(value.deliveryFeeCents) || value.deliveryFeeCents < 0 || !Number.isSafeInteger(value.minimumOrderCents) || value.minimumOrderCents < 0 || !Number.isSafeInteger(value.orderEstimateMinutes) || value.orderEstimateMinutes < 5 || value.orderEstimateMinutes > 240 || !Array.isArray(value.deliveryZones) || value.deliveryZones.length > 30 || value.deliveryZones.some((zone) => !zone.id || !zone.name.trim() || !Number.isSafeInteger(zone.feeCents) || zone.feeCents < 0)) throw new Error('Configuração de pedidos inválida.');
  await setDoc(doc(firebaseDb, 'orderSettings', 'main'), value);
}

export async function readOrderCategoriesAsync(): Promise<MenuCategory[]> { return (await readCollection<MenuCategory>('menuCategories', demoCategories)).filter((category) => category.active).sort((a, b) => a.displayOrder - b.displayOrder); }

export interface CreateOrderRequest {
  clientRequestId: string;
  customer: { name: string; whatsapp: string; email?: string };
  items: CartItemDraft[];
  fulfillment: { mode: 'PICKUP' | 'DELIVERY' | 'DINE_IN'; address?: { street: string; number: string; complement?: string; neighborhood: string; reference?: string }; zoneId?: string; tableId?: string };
  payment: { method: 'PIX' | 'CARD_ON_DELIVERY' | 'CASH'; needsChange: boolean; changeForCents?: number };
  notes?: string;
  promoCode?: string;
}

export async function createOrderAsync(input: CreateOrderRequest): Promise<{ orderId?: string; publicCode: string; orderNumber: string; totalCents: number }> {
  const token = firebaseAuth?.currentUser ? await firebaseAuth.currentUser.getIdToken() : null;
  const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(input) });
  const payload = await response.json().catch(() => ({})) as { orderId?: string; publicCode?: string; orderNumber?: string; totalCents?: number; error?: string };
  if (!response.ok || !payload.publicCode) throw new Error(payload.error || 'Não foi possível criar o pedido.');
  return { orderId: payload.orderId, publicCode: payload.publicCode, orderNumber: payload.orderNumber || payload.publicCode, totalCents: Number(payload.totalCents || 0) };
}

export async function readPublicOrderAsync(code: string): Promise<PublicOrder | null> {
  if (!isFirebaseDataMode() || !firebaseDb) return null;
  const snapshot = await getDoc(doc(firebaseDb, 'publicOrders', code.toUpperCase()));
  return snapshot.exists() ? snapshot.data() as PublicOrder : null;
}

export function watchPublicOrder(code: string, listener: (order: PublicOrder | null) => void): Unsubscribe {
  if (!isFirebaseDataMode() || !firebaseDb) { listener(null); return () => undefined; }
  return onSnapshot(doc(firebaseDb, 'publicOrders', code.toUpperCase()), (snapshot) => listener(snapshot.exists() ? snapshot.data() as PublicOrder : null), () => listener(null));
}

export async function readOrdersAsync(): Promise<OrderRecord[]> {
  if (!isFirebaseDataMode() || !firebaseDb) return [];
  const snapshot = await getDocs(collection(firebaseDb, 'orders'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderRecord).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export async function readCustomerOrdersAsync(uid: string): Promise<OrderRecord[]> {
  if (!isFirebaseDataMode() || !firebaseDb || !uid) return [];
  const snapshot = await getDocs(query(collection(firebaseDb, 'orders'), where('customerAccountUid', '==', uid)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderRecord).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export function watchOrders(listener: (orders: OrderRecord[]) => void): Unsubscribe {
  if (!isFirebaseDataMode() || !firebaseDb) { listener([]); return () => undefined; }
  return onSnapshot(collection(firebaseDb, 'orders'), (snapshot) => listener(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderRecord).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))), () => listener([]));
}

export async function readOrderNotificationsAsync(): Promise<OrderNotification[]> {
  if (!isFirebaseDataMode() || !firebaseDb) return [];
  const snapshot = await getDocs(collection(firebaseDb, 'orderNotifications'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderNotification).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))).slice(0, 30);
}

export function watchOrderNotifications(listener: (notifications: OrderNotification[]) => void): Unsubscribe {
  if (!isFirebaseDataMode() || !firebaseDb) { listener([]); return () => undefined; }
  return onSnapshot(collection(firebaseDb, 'orderNotifications'), (snapshot) => listener(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderNotification).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))).slice(0, 30)), () => listener([]));
}

export async function updateOrderStatusAsync(orderId: string, nextStatus: OrderStatus): Promise<void> {
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('O Firebase real é necessário para operar pedidos.');
  const db = firebaseDb;
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'orders', orderId); const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists()) throw new Error('Pedido não encontrado.');
    const current = snapshot.data() as OrderRecord;
    if (!ORDER_TRANSITIONS[current.status]?.includes(nextStatus)) throw new Error('Essa mudança de status não é permitida.');
    const history = [...(current.history || []), { status: nextStatus, label: getOrderStatusMessage(nextStatus), at: new Date().toISOString() }];
    transaction.update(orderRef, { status: nextStatus, statusMessage: getOrderStatusMessage(nextStatus), history, updatedAt: serverTimestamp() });
    transaction.update(doc(db, 'publicOrders', current.publicCode), { status: nextStatus, statusMessage: getOrderStatusMessage(nextStatus), history, updatedAt: serverTimestamp() });
    if (nextStatus === 'COMPLETED') {
      const now = new Date().toISOString();
      transaction.set(doc(db, 'financeEntries', `order-${current.id}`), { id: `order-${current.id}`, kind: 'INCOME', category: 'Pedidos internos', amountCents: current.pricing.totalCents, date: now.slice(0, 10), description: `Pedido ${current.orderNumber}`, status: 'PAID', orderNumber: current.orderNumber, sourceOrderId: current.id, notes: 'Lançamento gerado ao concluir o pedido.', createdAt: now, updatedAt: now });
    }
  });
}

export { randomId as createClientRequestId };
