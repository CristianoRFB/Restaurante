import fs from 'node:fs';

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
}

function firestoreValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (value && typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, firestoreValue(nested)])) } };
  return { nullValue: 'NULL_VALUE' };
}

const env = { ...readEnvFile('.env.production'), ...process.env };
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const email = process.env.FIREBASE_ADMIN_EMAIL;
const password = process.env.FIREBASE_ADMIN_PASSWORD;
if (!projectId || !apiKey || !email || !password) throw new Error('Defina FIREBASE_ADMIN_EMAIL e FIREBASE_ADMIN_PASSWORD; a configuração pública vem de .env.production.');

const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
if (!authResponse.ok) throw new Error(`Falha ao autenticar o operador: ${await authResponse.text()}`);
const { idToken } = await authResponse.json();

const settings = {
  name: 'Baru Gastronomia',
  tagline: 'Boa comida aproxima pessoas.',
  city: 'Foz do Iguaçu · PR',
  address: 'Av. Paraná, 3515 · Jardim Central, Foz do Iguaçu · PR',
  whatsapp: '5545991125003',
  timezone: 'America/Sao_Paulo',
  maxPartySize: 20,
  reservationLeadHours: 2,
  reservationDurationMinutes: 120,
  confirmationMode: 'MANUAL',
  officialMenuUrl: 'https://cardapio.barugastronomia.com.br/',
  onlineOrderingUrl: 'https://www.ifood.com.br/delivery/ok-ok/ok/2f8d493e-c173-4669-899e-1483e9fffb12?UTM_Medium=share',
  openingHours: {
    monday: { open: '07:00', close: '00:00', closed: false },
    tuesday: { open: '07:00', close: '00:00', closed: false },
    wednesday: { open: '07:00', close: '00:00', closed: false },
    thursday: { open: '07:00', close: '00:00', closed: false },
    friday: { open: '07:00', close: '00:00', closed: false },
    saturday: { open: '07:00', close: '00:00', closed: false },
    sunday: { open: '08:00', close: '00:00', closed: false },
  },
  demoMode: false,
};

const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/restaurantSettings/main`;
const response = await fetch(endpoint, {
  method: 'PATCH',
  headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ fields: Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, firestoreValue(value)])) }),
});
if (!response.ok) throw new Error(`Falha ao publicar restaurantSettings/main: ${await response.text()}`);
console.log(`restaurantSettings/main publicado no projeto ${projectId}.`);
