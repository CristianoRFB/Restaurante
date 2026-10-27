import { env } from 'cloudflare:workers';

type FirestoreValue = { stringValue?: string; integerValue?: string; booleanValue?: boolean; mapValue?: { fields?: Record<string, FirestoreValue> }; arrayValue?: { values?: FirestoreValue[] }; nullValue?: string };
type FirestoreResponse = { fields?: Record<string, FirestoreValue> };
let cache: { token: string; expiresAt: number } | null = null;

function base64Url(value: ArrayBuffer | string): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decodeBase64(value: string): ArrayBuffer {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, (v) => v.charCodeAt(0)).buffer;
}
export async function serviceToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 60_000) return cache.token;
  const secret = (env as unknown as Record<string, string | undefined>).FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!secret) throw new Error('Firebase service account indisponível no Worker.');
  const account = JSON.parse(secret) as { client_email: string; private_key: string; token_uri?: string };
  if (!account.client_email || !account.private_key) throw new Error('Configuração privada de Firebase inválida.');
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const assertionBody = base64Url(JSON.stringify({
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore',
    aud: account.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const der = decodeBase64(account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ''));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(header + '.' + assertionBody));
  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: header + '.' + assertionBody + '.' + base64Url(signature) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Falha de autenticação Firebase do Worker.');
  const data = await response.json() as { access_token: string; expires_in: number };
  if (!data.access_token || !data.expires_in) throw new Error('Resposta de autenticação Firebase inválida.');
  cache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.token;
}
function decodeValue(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('arrayValue' in value) return (value.arrayValue?.values || []).map(decodeValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([k, v]) => [k, decodeValue(v)]));
  if ('nullValue' in value) return null;
  return null;
}
export async function getPrivateFoodDocument(segments: string[]): Promise<Record<string, unknown> | null> {
  const emulatorMode = process.env.FOOD_DEMO_ORDERS_MODE === 'emulator';
  const projectId = emulatorMode
    ? process.env.FIREBASE_PROJECT_ID || ''
    : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(projectId)) throw new Error('Projeto Firebase não configurado.');
  if (segments.length < 2 || segments.length % 2 !== 0 || segments.some((segment) => !/^[a-zA-Z0-9_-]{1,128}$/.test(segment))) {
    throw new Error('Caminho Firestore inválido.');
  }
  const path = segments.map(encodeURIComponent).join('/');
  let url: string;
  let auth: string;
  if (emulatorMode) {
    const host = process.env.FIRESTORE_EMULATOR_HOST || '';
    if (!/^demo-[a-z0-9-]+$/.test(projectId) || !/^(127\.0\.0\.1|localhost):[0-9]{2,5}$/.test(host)) {
      throw new Error('Demo só permite Firestore Emulator local com projeto demo-.');
    }
    url = 'http://' + host + '/v1/projects/' + projectId + '/databases/(default)/documents/' + path;
    auth = 'Bearer owner'; // Magic admin token is confined to a validated loopback emulator.
  } else {
    url = 'https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/' + path;
    auth = 'Bearer ' + await serviceToken();
  }
  const response = await fetch(url, { headers: { authorization: auth }, signal: AbortSignal.timeout(10_000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Leitura privada de documento Firebase indisponível.');
  const body = await response.json() as FirestoreResponse;
  return Object.fromEntries(Object.entries(body.fields ?? {}).map(([k, v]) => [k, decodeValue(v)]));
}

export class FoodWorkerAuthError extends Error {}
export async function verifyFoodFirebaseBearer(request: Request): Promise<string> {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 5000) throw new FoodWorkerAuthError('Token ausente.');
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  if (!key) throw new Error('Firebase Auth não configurado no Worker.');
  // Local demo tokens must NEVER be sent to the production Google Identity Toolkit.
  const emulatorMode = process.env.FOOD_DEMO_ORDERS_MODE === 'emulator';
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  if (emulatorMode && !/^(127\.0\.0\.1|localhost):[0-9]{2,5}$/.test(emulatorHost)) {
    throw new FoodWorkerAuthError('Auth Emulator host inválido.');
  }
  const identityUrl = emulatorMode
    ? 'http://' + emulatorHost + '/identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(key)
    : 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(key);
  const response = await fetch(identityUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: authorization.slice(7) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new FoodWorkerAuthError('Autenticação inválida.');
  const data = await response.json() as { users?: Array<{ localId?: string }> };
  const uid = data.users?.[0]?.localId;
  if (!uid || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) throw new FoodWorkerAuthError('Sessão inválida.');
  return uid;
}
