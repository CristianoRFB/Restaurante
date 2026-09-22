import { env } from 'cloudflare:workers';
import { generateTimeSlots, normalizeWhatsapp, validateReservation, type RestaurantSettings, type RestaurantTable } from '@/shared/baru-domain';
import { z } from 'zod';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const database = `projects/${projectId}/databases/(default)`;
const firestoreDocuments = `https://firestore.googleapis.com/v1/${database}/documents`;
const requestWindowMs = 60_000;
const requestLimit = 8;
const fallbackRecentRequests = new Map<string, { count: number; resetAt: number }>();
let accessTokenCache: { value: string; expiresAt: number } | null = null;

const reservationPayloadSchema = z.object({
  date: z.string().min(1).max(10),
  time: z.string().min(1).max(5),
  partySize: z.number().int().min(1).max(20),
  customerName: z.string().trim().min(2).max(100),
  whatsapp: z.string().min(10).max(32),
  note: z.string().max(500).optional().default(''),
  idempotencyKey: z.string().min(16).max(100).optional(),
}).strict();
type ReservationPayload = z.infer<typeof reservationPayloadSchema>;

type FirestoreValue = { stringValue?: string; integerValue?: string; booleanValue?: boolean; mapValue?: { fields?: Record<string, FirestoreValue> }; arrayValue?: { values?: FirestoreValue[] }; nullValue?: string };

function base64Url(value: ArrayBuffer | string): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

function pemToDer(pem: string): ArrayBuffer {
  return decodeBase64(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''));
}

async function googleAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) return accessTokenCache.value;
  const secret = (env as unknown as Record<string, string | undefined>).FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!secret) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado no Worker.');
  const account = JSON.parse(secret) as { client_email: string; private_key: string; token_uri?: string };
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = base64Url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(account.private_key), algorithm, false, ['sign']);
  const signature = await crypto.subtle.sign(algorithm, key, new TextEncoder().encode(`${header}.${claim}`));
  const assertion = `${header}.${claim}.${base64Url(signature)}`;
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Não foi possível autenticar o Worker no Firebase: ${await response.text()}`);
  const data = await response.json() as { access_token: string; expires_in: number };
  accessTokenCache = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function firestoreRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${await googleAccessToken()}`);
  headers.set('content-type', 'application/json');
  return fetch(`${firestoreDocuments}${path}`, { ...init, headers, signal: AbortSignal.timeout(10_000) });
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([key, nested]) => [key, fromFirestoreValue(nested)]));
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map((nested) => fromFirestoreValue(nested));
  return null;
}

function fromFirestoreDocument(document: { fields?: Record<string, FirestoreValue> }): Record<string, unknown> {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map((item) => toFirestoreValue(item)) } };
  if (value && typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toFirestoreValue(nested)])) } };
  return { nullValue: 'NULL_VALUE' };
}

function toFields(value: Record<string, unknown>): Record<string, FirestoreValue> {
  return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toFirestoreValue(nested)]));
}

async function listDocuments<T>(collectionName: string): Promise<T[]> {
  const response = await firestoreRequest(`/${collectionName}?pageSize=100`);
  if (!response.ok) throw new Error(`Falha ao consultar ${collectionName}: ${await response.text()}`);
  const data = await response.json() as { documents?: Array<{ name: string; fields?: Record<string, FirestoreValue> }> };
  return (data.documents || []).map((document) => ({ id: document.name.split('/').at(-1), ...fromFirestoreDocument(document) }) as T);
}

function lockIds(date: string, time: string, tableId: string, durationMinutes: number): string[] {
  const [hour, minute] = time.split(':').map(Number);
  const start = hour * 60 + minute;
  return Array.from({ length: Math.max(1, Math.ceil(durationMinutes / 30)) }, (_, index) => `${date}_${String(start + index * 30).padStart(4, '0')}_${tableId}`);
}

function resource(collectionName: string, id: string): string {
  return `${database}/documents/${collectionName}/${encodeURIComponent(id)}`;
}

async function createReservation(body: ReservationPayload): Promise<Record<string, unknown>> {
  const settingsResponse = await firestoreRequest('/restaurantSettings/main');
  if (!settingsResponse.ok) throw new Error('Configurações de reserva não publicadas.');
  const settings = fromFirestoreDocument(await settingsResponse.json()) as unknown as RestaurantSettings;
  const validationErrors = validateReservation({ date: body.date, time: body.time, partySize: body.partySize, customerName: body.customerName, whatsapp: body.whatsapp, note: body.note }, settings);
  if (validationErrors.length) throw new Error(validationErrors[0]);
  if (!generateTimeSlots(settings, body.date).includes(body.time)) throw new Error('Escolha um horário dentro do funcionamento do restaurante.');
  const tables = (await listDocuments<RestaurantTable>('tables')).filter((table) => table.active && table.state === 'AVAILABLE' && table.capacity >= body.partySize);
  if (!tables.length) throw new Error('Reservas online aguardam o cadastro das mesas disponíveis pela equipe.');

  const reservationIdempotency = body.idempotencyKey || crypto.randomUUID();
  const whatsapp = normalizeWhatsapp(body.whatsapp);
  const duration = settings.reservationDurationMinutes;
  const lockResources = tables.flatMap((table) => lockIds(body.date, body.time, table.id, duration).map((id) => ({ tableId: table.id, id, name: resource('reservationLocks', id) })));
  const requestName = resource('reservationRequests', reservationIdempotency);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const batchResponse = await firestoreRequest(':batchGet', { method: 'POST', body: JSON.stringify({ documents: [requestName, ...lockResources.map((lock) => lock.name)], newTransaction: {} }) });
    if (!batchResponse.ok) throw new Error(`Falha ao reservar disponibilidade: ${await batchResponse.text()}`);
    const batch = await batchResponse.json() as Array<{ transaction?: string; found?: { name: string; fields?: Record<string, FirestoreValue> } }>;
    const transaction = batch.find((entry) => entry.transaction)?.transaction;
    const requestDocument = batch.find((entry) => entry.found?.name === requestName)?.found;
    if (!transaction) throw new Error('Não foi possível abrir a transação de reserva.');
    if (requestDocument) {
      const request = fromFirestoreDocument(requestDocument) as { code?: string };
      if (!request.code) throw new Error('Solicitação idempotente inválida.');
      const publicResponse = await firestoreRequest(`/publicReservations/${encodeURIComponent(request.code)}`);
      if (!publicResponse.ok) throw new Error('Solicitação idempotente sem projeção pública.');
      return fromFirestoreDocument(await publicResponse.json());
    }
    const foundLocks = new Set(batch.flatMap((entry) => entry.found?.name ? [entry.found.name] : []));
    const availableTable = tables.find((table) => lockIds(body.date, body.time, table.id, duration).every((id) => !foundLocks.has(resource('reservationLocks', id))));
    if (!availableTable) throw new Error('Não há mesa disponível para esse horário.');
    const now = new Date().toISOString();
    const id = `res-${crypto.randomUUID()}`;
    const code = `BRU-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
    const reservation = { id, code, date: body.date, time: body.time, partySize: body.partySize, customerId: 'guest', customerName: body.customerName, whatsapp, note: body.note, status: 'NEW', tableId: availableTable.id, source: 'SITE', history: [{ id: crypto.randomUUID(), status: 'NEW', label: 'Reserva criada', createdAt: now, by: 'Site' }], createdAt: now, updatedAt: now, idempotencyKey: reservationIdempotency };
    const publicReservation = { id, code, date: reservation.date, time: reservation.time, partySize: reservation.partySize, customerName: reservation.customerName, whatsappLast4: whatsapp.slice(-4), status: 'NEW', createdAt: now, updatedAt: now };
    const writes = [
      { update: { name: resource('reservations', id), fields: toFields(reservation) } },
      { update: { name: resource('publicReservations', code), fields: toFields(publicReservation) } },
      { update: { name: requestName, fields: toFields({ idempotencyKey: reservationIdempotency, reservationId: id, code, createdAt: now }) } },
      ...lockIds(reservation.date, reservation.time, availableTable.id, duration).map((lockId) => ({ update: { name: resource('reservationLocks', lockId), fields: toFields({ reservationId: id, date: reservation.date, time: reservation.time, tableId: availableTable.id, createdAt: now }) } })),
    ];
    const commit = await firestoreRequest(':commit', { method: 'POST', body: JSON.stringify({ transaction, writes }) });
    if (commit.ok) return publicReservation;
    if (commit.status !== 409 && commit.status !== 429) throw new Error(`Falha ao confirmar reserva: ${await commit.text()}`);
  }
  throw new Error('A disponibilidade mudou durante a solicitação. Tente novamente.');
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

async function rateLimitKey(request: Request): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp(request)));
  return `reservation:${base64Url(digest)}`;
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

export async function POST(request: Request): Promise<Response> {
  if (!(await allowRequest(request))) return Response.json({ error: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429, headers: { 'cache-control': 'no-store' } });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 32_768) return Response.json({ error: 'Payload de reserva excede o limite permitido.' }, { status: 413, headers: { 'cache-control': 'no-store' } });
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 32_768) return Response.json({ error: 'Payload de reserva excede o limite permitido.' }, { status: 413, headers: { 'cache-control': 'no-store' } });
    let decodedBody: unknown;
    try { decodedBody = JSON.parse(rawBody); } catch { return Response.json({ error: 'JSON de reserva inválido.' }, { status: 400 }); }
    const parsedBody = reservationPayloadSchema.safeParse(decodedBody);
    if (!parsedBody.success) return Response.json({ error: 'Payload de reserva inválido.' }, { status: 400 });
    const result = await createReservation(parsedBody.data);
    return Response.json(result, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível processar a reserva.';
    const status = /aguardam|não há mesa|configurações|horário|data|pessoas|nome|WhatsApp|observação|disponível/.test(message) ? 409 : 500;
    return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } });
  }
}
