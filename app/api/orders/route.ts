import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { calculateCartPreview, type CartItemDraft, type OrderCatalog, type OrderModifier, type OrderModifierGroup, type OrderStatus, type Promotion } from '@/shared/order-domain';
import { getStoreAvailability, type RestaurantSettings, type MenuItem } from '@/shared/baru-domain';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const database = `projects/${projectId}/databases/(default)`;
const firestoreDocuments = `https://firestore.googleapis.com/v1/${database}/documents`;
const requestWindowMs = 60_000;
const requestLimit = 8;
const fallbackRecentRequests = new Map<string, { count: number; resetAt: number }>();
const orderRequestSchema = z.object({
  clientRequestId: z.string().trim().min(16).max(100),
  customer: z.object({ name: z.string().trim().min(2).max(100), whatsapp: z.string().trim().min(10).max(32), email: z.string().email().max(320).optional() }).strict(),
  items: z.array(z.object({ cartItemId: z.string().min(1).max(120), productId: z.string().min(1).max(120), sizeId: z.string().min(1).max(120), selections: z.array(z.object({ groupId: z.string().min(1).max(120), items: z.array(z.object({ modifierId: z.string().min(1).max(120), quantity: z.number().int().min(1).max(20) })).max(20) })).max(20), quantity: z.number().int().min(1).max(20), notes: z.string().max(300).optional() }).strict()).min(1).max(30),
  fulfillment: z.object({ mode: z.enum(['PICKUP', 'DELIVERY', 'DINE_IN']), address: z.object({ street: z.string().trim().min(2).max(120), number: z.string().trim().min(1).max(20), complement: z.string().max(80).optional(), neighborhood: z.string().trim().min(2).max(80), reference: z.string().max(120).optional() }).strict().optional(), zoneId: z.string().max(120).optional(), tableId: z.string().max(120).optional() }).strict(),
  payment: z.object({ method: z.enum(['PIX', 'CARD_ON_DELIVERY', 'CASH']), needsChange: z.boolean(), changeForCents: z.number().int().min(0).max(10_000_000).optional() }).strict(),
  notes: z.string().max(500).optional(),
  promoCode: z.string().trim().max(40).optional(),
}).strict();
type OrderPayload = z.infer<typeof orderRequestSchema>;
type FirestoreValue = { stringValue?: string; integerValue?: string; booleanValue?: boolean; mapValue?: { fields?: Record<string, FirestoreValue> }; arrayValue?: { values?: FirestoreValue[] }; nullValue?: string };
type FirestoreDocument = { name?: string; fields?: Record<string, FirestoreValue> };
let accessTokenCache: { value: string; expiresAt: number } | null = null;

function base64Url(value: ArrayBuffer | string): string { const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value); let binary = ''; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
function decodeBase64(value: string): ArrayBuffer { const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)); return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer; }
function pemToDer(pem: string): ArrayBuffer { return decodeBase64(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')); }
async function googleAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) return accessTokenCache.value;
  const secret = (env as unknown as Record<string, string | undefined>).FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!secret) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado no Worker.');
  const account = JSON.parse(secret) as { client_email: string; private_key: string; token_uri?: string };
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })); const now = Math.floor(Date.now() / 1000); const claim = base64Url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const; const key = await crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), algorithm, false, ['sign']); const signature = await crypto.subtle.sign(algorithm, key, new TextEncoder().encode(`${header}.${claim}`));
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${base64Url(signature)}` }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Não foi possível autenticar o Worker no Firebase.');
  const data = await response.json() as { access_token: string; expires_in: number }; accessTokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }; return data.access_token;
}
async function firestoreRequest(path: string, init: RequestInit = {}): Promise<Response> { const headers = new Headers(init.headers); headers.set('authorization', `Bearer ${await googleAccessToken()}`); headers.set('content-type', 'application/json'); return fetch(`${firestoreDocuments}${path}`, { ...init, headers, signal: AbortSignal.timeout(10_000) }); }
function fromFirestoreValue(value: FirestoreValue): unknown { if ('stringValue' in value) return value.stringValue; if ('integerValue' in value) return Number(value.integerValue); if ('booleanValue' in value) return value.booleanValue; if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([key, nested]) => [key, fromFirestoreValue(nested)])); if ('arrayValue' in value) return (value.arrayValue?.values || []).map((nested) => fromFirestoreValue(nested)); return null; }
function fromFirestoreDocument(document: FirestoreDocument): Record<string, unknown> { return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)])); }
function toFirestoreValue(value: unknown): FirestoreValue { if (typeof value === 'string') return { stringValue: value }; if (typeof value === 'boolean') return { booleanValue: value }; if (typeof value === 'number') return { integerValue: String(value) }; if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } }; if (value && typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toFirestoreValue(nested)])) } }; return { nullValue: 'NULL_VALUE' }; }
function toFields(value: Record<string, unknown>): Record<string, FirestoreValue> { return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toFirestoreValue(nested)])); }
function resource(collectionName: string, id: string): string { return `${database}/documents/${collectionName}/${encodeURIComponent(id)}`; }
async function getDocument(collectionName: string, id: string): Promise<Record<string, unknown> | null> { const response = await firestoreRequest(`/${collectionName}/${encodeURIComponent(id)}`); if (response.status === 404) return null; if (!response.ok) throw new Error(`Falha ao consultar ${collectionName}.`); return fromFirestoreDocument(await response.json() as FirestoreDocument); }
async function listDocuments<T>(collectionName: string): Promise<T[]> { const response = await firestoreRequest(`/${collectionName}?pageSize=500`); if (!response.ok && response.status !== 404) throw new Error(`Falha ao consultar ${collectionName}.`); const data = await response.json().catch(() => ({})) as { documents?: FirestoreDocument[] }; return (data.documents || []).map((document) => ({ id: document.name?.split('/').at(-1), ...fromFirestoreDocument(document) }) as T); }

async function loadCatalog(): Promise<OrderCatalog> { const [items, groups, modifiers] = await Promise.all([listDocuments<MenuItem>('menuItems'), listDocuments<OrderModifierGroup>('modifierGroups'), listDocuments<OrderModifier>('modifiers')]); return { items: items.filter((item) => item.active) as OrderCatalog['items'], groups: groups.filter((group) => group.active), modifiers: modifiers.filter((modifier) => modifier.active) }; }

async function loadPromotions(): Promise<Promotion[]> { return (await listDocuments<Promotion>('promotions')).filter((promotion) => promotion.active); }

function applyPromotion(code: string | undefined, subtotalCents: number, promotions: Promotion[]): { discountCents: number; promotion?: { code: string; title: string } } {
  if (!code) return { discountCents: 0 };
  const normalized = code.trim().toUpperCase();
  const promotion = promotions.find((candidate) => candidate.code.trim().toUpperCase() === normalized);
  if (!promotion) throw new Error('Cupom não encontrado ou indisponível.');
  const now = Date.now();
  if ((promotion.startsAt && Date.parse(promotion.startsAt) > now) || (promotion.endsAt && Date.parse(promotion.endsAt) < now)) throw new Error('Cupom fora do período de validade.');
  if (subtotalCents < promotion.minOrderCents) throw new Error(`Este cupom exige pedido mínimo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(promotion.minOrderCents / 100)}.`);
  if (promotion.discountType === 'PERCENT' && (!Number.isSafeInteger(promotion.discountValue) || promotion.discountValue < 1 || promotion.discountValue > 100)) throw new Error('Configuração de desconto inválida.');
  if (promotion.discountType === 'FIXED' && (!Number.isSafeInteger(promotion.discountValue) || promotion.discountValue < 1)) throw new Error('Configuração de desconto inválida.');
  const discountCents = promotion.discountType === 'PERCENT' ? Math.floor(subtotalCents * promotion.discountValue / 100) : Math.min(subtotalCents, promotion.discountValue);
  return { discountCents, promotion: { code: promotion.code, title: promotion.title } };
}

function publicCode(): string { return `BRU-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`; }
function validateCustomer(payload: OrderPayload): void { const digits = payload.customer.whatsapp.replace(/\D/g, ''); if (digits.length < 10 || digits.length > 15) throw new Error('Informe um WhatsApp válido.'); if (payload.fulfillment.mode === 'DELIVERY' && !payload.fulfillment.address) throw new Error('Preencha o endereço de entrega.'); if (payload.fulfillment.mode === 'DINE_IN' && !payload.fulfillment.tableId) throw new Error('Informe a mesa para consumir no local.'); if (payload.payment.method !== 'CASH' && (payload.payment.needsChange || payload.payment.changeForCents !== undefined)) throw new Error('Troco só pode ser informado para dinheiro.'); }

async function verifyCustomerToken(request: Request): Promise<string | undefined> {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return undefined;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  if (!apiKey) return undefined;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: authorization.slice(7) }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return undefined;
  const data = await response.json() as { users?: Array<{ localId?: string }> };
  return data.users?.[0]?.localId;
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

async function rateLimitKey(request: Request): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp(request)));
  return `order:${base64Url(digest)}`;
}

function allowFallbackRequest(request: Request): boolean {
  const ip = clientIp(request);
  const now = Date.now();
  const current = fallbackRecentRequests.get(ip);
  if (!current || current.resetAt <= now) { fallbackRecentRequests.set(ip, { count: 1, resetAt: now + requestWindowMs }); return true; }
  if (current.count >= requestLimit) return false;
  current.count += 1;
  return true;
}

async function allowRequest(request: Request): Promise<boolean> {
  const kv = (env as unknown as { RESERVATION_RATE_LIMIT?: KVNamespace }).RESERVATION_RATE_LIMIT;
  if (!kv) return allowFallbackRequest(request);
  try {
    const key = await rateLimitKey(request);
    const now = Date.now();
    const raw = await kv.get(key);
    const current = raw ? JSON.parse(raw) as { count: number; resetAt: number } : null;
    if (current && current.resetAt > now && current.count >= requestLimit) return false;
    const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + requestWindowMs } : { count: current.count + 1, resetAt: current.resetAt };
    await kv.put(key, JSON.stringify(next), { expirationTtl: Math.ceil((next.resetAt - now) / 1000) });
    return true;
  } catch (error) {
    console.warn('Rate limit KV indisponível; usando fallback local.', error);
    return allowFallbackRequest(request);
  }
}

async function createOrder(payload: OrderPayload, customerAccountUid?: string): Promise<Record<string, unknown>> {
  validateCustomer(payload);
  if (payload.fulfillment.mode === 'DINE_IN') {
    const tables = await listDocuments<{ id?: string; active?: boolean; state?: string }>('tables');
    if (!tables.some((table) => table.id === payload.fulfillment.tableId && table.active && table.state !== 'MAINTENANCE')) throw new Error('A mesa informada não está disponível para consumo no local.');
  }
  const existingRequest = await getDocument('orderRequests', payload.clientRequestId);
  if (existingRequest?.publicCode) { const existingPublic = await getDocument('publicOrders', String(existingRequest.publicCode)); if (existingPublic) return existingPublic; }
  const [catalog, promotions, restaurantSettings] = await Promise.all([loadCatalog(), loadPromotions(), getDocument('restaurantSettings', 'main')]);
  if (!restaurantSettings || typeof restaurantSettings.timezone !== 'string' || !restaurantSettings.openingHours) throw new Error('A configuração de funcionamento do restaurante ainda não foi publicada.');
  const availability = getStoreAvailability(restaurantSettings as Pick<RestaurantSettings, 'openingHours' | 'timezone'>);
  if (!availability.isOpen) throw new Error(`Os pedidos estão fechados agora. ${availability.nextOpeningLabel || 'Consulte o próximo horário de abertura.'}`);
  const preview = calculateCartPreview(payload.items as CartItemDraft[], catalog);
  const orderSettings = await getDocument('orderSettings', 'main') as { acceptingOrders?: boolean; fulfillmentModes?: string[]; paymentMethods?: string[]; deliveryFeeCents?: number; minimumOrderCents?: number; orderEstimateMinutes?: number; deliveryZones?: Array<{ id: string; name: string; feeCents: number; active: boolean }> } | null;
  if (orderSettings?.acceptingOrders === false) throw new Error('Os pedidos estão pausados no momento.');
  const modes = orderSettings?.fulfillmentModes || ['PICKUP'];
  const payments = orderSettings?.paymentMethods || ['PIX', 'CARD_ON_DELIVERY', 'CASH'];
  if (!modes.includes(payload.fulfillment.mode)) throw new Error('Esta forma de recebimento ainda não está disponível.');
  if (!payments.includes(payload.payment.method)) throw new Error('Esta forma de pagamento ainda não está disponível.');
  const configuredZones = (orderSettings?.deliveryZones || []).filter((zone) => zone.active);
  const selectedZone = payload.fulfillment.mode === 'DELIVERY' && payload.fulfillment.zoneId ? configuredZones.find((zone) => zone.id === payload.fulfillment.zoneId) : undefined;
  if (payload.fulfillment.mode === 'DELIVERY' && configuredZones.length && !selectedZone) throw new Error('Selecione uma zona de entrega válida.');
  const deliveryFeeCents = payload.fulfillment.mode === 'DELIVERY' ? Number(selectedZone?.feeCents ?? orderSettings?.deliveryFeeCents ?? 0) : 0;
  const appliedPromotion = applyPromotion(payload.promoCode, preview.subtotalCents, promotions);
  const minimumOrderCents = Number(orderSettings?.minimumOrderCents || 0);
  if (preview.subtotalCents < minimumOrderCents) throw new Error(`O pedido mínimo é ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minimumOrderCents / 100)}.`);
  const totalCents = Math.max(0, preview.subtotalCents + deliveryFeeCents - appliedPromotion.discountCents);
  if (payload.payment.method === 'CASH' && payload.payment.needsChange && (!payload.payment.changeForCents || payload.payment.changeForCents < totalCents)) throw new Error('O valor para troco precisa ser igual ou maior que o total.');
  const now = new Date().toISOString(); const code = publicCode(); const orderId = `ord-${crypto.randomUUID()}`; const status: OrderStatus = 'NEW';
  const pricing = { subtotalCents: preview.subtotalCents, deliveryFeeCents, discountCents: appliedPromotion.discountCents, totalCents };
  const order = { id: orderId, publicCode: code, orderNumber: `#${code}`, ...(customerAccountUid ? { customerAccountUid } : {}), customer: { ...payload.customer, whatsapp: payload.customer.whatsapp.replace(/\D/g, '') }, items: preview.items, pricing, ...(appliedPromotion.promotion ? { promotion: appliedPromotion.promotion } : {}), fulfillment: payload.fulfillment, payment: payload.payment, notes: payload.notes || '', status, statusMessage: 'Pedido recebido. A loja vai confirmar em instantes.', estimatedMinutes: Number(orderSettings?.orderEstimateMinutes || 30), history: [{ status, label: 'Pedido recebido', at: now }], source: 'SITE', clientRequestId: payload.clientRequestId, createdAt: now, updatedAt: now };
  const notification = { id: `new-${orderId}`, type: 'NEW_ORDER', orderId, orderNumber: order.orderNumber, publicCode: code, title: 'Novo pedido recebido', body: `${payload.customer.name} fez um pedido de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCents / 100)}.`, read: false, createdAt: now };
  const publicOrder = { publicCode: code, orderNumber: order.orderNumber, items: preview.items, pricing, ...(appliedPromotion.promotion ? { promotion: appliedPromotion.promotion } : {}), fulfillment: { mode: payload.fulfillment.mode }, payment: { method: payload.payment.method }, status, statusMessage: order.statusMessage, estimatedMinutes: order.estimatedMinutes, history: order.history, createdAt: now, updatedAt: now };
  const commit = await firestoreRequest(':commit', { method: 'POST', body: JSON.stringify({ writes: [{ update: { name: resource('orders', orderId), fields: toFields(order) } }, { update: { name: resource('publicOrders', code), fields: toFields(publicOrder) } }, { update: { name: resource('orderNotifications', notification.id), fields: toFields(notification) } }, { update: { name: resource('orderRequests', payload.clientRequestId), fields: toFields({ clientRequestId: payload.clientRequestId, orderId, publicCode: code, createdAt: now }), currentDocument: { exists: false } } }] }) });
  if (!commit.ok) { const raced = await getDocument('orderRequests', payload.clientRequestId); if (raced?.publicCode) { const racedPublic = await getDocument('publicOrders', String(raced.publicCode)); if (racedPublic) return racedPublic; } throw new Error('Não foi possível confirmar o pedido. Tente novamente sem duplicar o envio.'); }
  return publicOrder;
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!(await allowRequest(request))) return Response.json({ error: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429, headers: { 'cache-control': 'no-store' } });
    const length = Number(request.headers.get('content-length') || 0); if (length > 64_000) return Response.json({ error: 'Pedido muito grande.' }, { status: 413 });
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 64_000) return Response.json({ error: 'Pedido muito grande.' }, { status: 413 });
    let decodedBody: unknown;
    try { decodedBody = JSON.parse(rawBody); } catch { return Response.json({ error: 'JSON do pedido inválido.' }, { status: 400 }); }
    const parsed = orderRequestSchema.safeParse(decodedBody); if (!parsed.success) return Response.json({ error: 'Dados do pedido inválidos.' }, { status: 400 });
    const result = await createOrder(parsed.data, await verifyCustomerToken(request)); return Response.json({ orderId: result.id, publicCode: result.publicCode, orderNumber: result.orderNumber, totalCents: (result.pricing as { totalCents: number }).totalCents }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) { const message = error instanceof Error ? error.message : 'Não foi possível criar o pedido.'; const status = /inválid|indisponível|pausados|fechados|funcionamento|mínimo|troco|WhatsApp|endereço|duplicar|Cupom|cupom|zona|período|publicada/.test(message) ? 409 : 500; return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } }); }
}
