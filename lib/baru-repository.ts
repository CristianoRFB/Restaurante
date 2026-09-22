import { areas as demoAreas, categories as demoCategories, content as demoContent, customers as demoCustomers, menuItems as demoMenuItems, moments as demoMoments, reservations as seedReservations, settings as demoSettings, tables as demoTables, team as demoTeam } from '@/lib/baru-data';
import { collection, doc, getDoc, getDocs, query, runTransaction, setDoc, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type Unsubscribe } from 'firebase/auth';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import { validateReservation, type Area, type Customer, type MenuCategory, type MenuItem, type PublicReservation, type Reservation, type RestaurantSettings, type RestaurantTable, type ServiceMoment, type SiteContent, type TeamMember } from '@/shared/baru-domain';

const RESERVATIONS_KEY = 'baru-reservations-v1';
const SESSION_KEY = 'baru-admin-session-v1';

export interface AdminSession {
  uid: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVICE';
  demo: boolean;
}

export type ReservationInput = Omit<Reservation, 'id' | 'code' | 'history' | 'createdAt' | 'updatedAt'>;

function makeReservationIdentity(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildReservation(input: ReservationInput): Reservation {
  const now = new Date().toISOString();
  return {
    ...input,
    id: `res-${makeReservationIdentity()}`,
    code: `BRU-${makeReservationIdentity().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
    history: [{ id: makeReservationIdentity(), status: input.status, label: 'Reserva criada', createdAt: now, by: input.source === 'ADMIN' ? 'Equipe' : 'Site' }],
    createdAt: now,
    updatedAt: now,
  };
}

const reservationOccupiesTable = (reservation: Pick<Reservation, 'status' | 'tableId'>) => Boolean(reservation.tableId && ['CONFIRMED', 'ARRIVED'].includes(reservation.status));

function reservationLockIds(reservation: Pick<Reservation, 'date' | 'time' | 'tableId'>, durationMinutes = 120): string[] {
  if (!reservation.tableId) return [];
  const [hour, minute] = reservation.time.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return [];
  const start = hour * 60 + minute;
  const slots = Math.max(1, Math.ceil(durationMinutes / 30));
  return Array.from({ length: slots }, (_, index) => reservation.date + '_' + String(start + index * 30).padStart(4, '0') + '_' + reservation.tableId);
}

function configuredReservationDuration(data?: Record<string, unknown>): number {
  const duration = Number(data?.reservationDurationMinutes);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('A duração das reservas ainda não foi configurada no Firebase.');
  return duration;
}

function hasLocalTableConflict(reservation: Pick<Reservation, 'id' | 'date' | 'time' | 'tableId' | 'status'>, current: Reservation[]): boolean {
  if (!reservationOccupiesTable(reservation)) return false;
  const nextLocks = new Set(reservationLockIds(reservation));
  return current.some((item) => reservationOccupiesTable(item) && item.id !== reservation.id && reservationLockIds(item).some((lock) => nextLocks.has(lock)));
}

function validateOperationalTable(table: RestaurantTable | undefined, reservation: Pick<Reservation, 'tableId' | 'partySize'>): void {
  if (!reservation.tableId) return;
  if (!table || !table.active || table.state === 'MAINTENANCE') throw new Error('A mesa selecionada não está disponível para operação.');
  if (table.capacity < reservation.partySize) throw new Error('A mesa selecionada não comporta o número de pessoas.');
}

function reservationValidationInput(reservation: Pick<Reservation, 'date' | 'time' | 'partySize' | 'customerName' | 'whatsapp' | 'note'>) {
  return { date: reservation.date, time: reservation.time, partySize: reservation.partySize, customerName: reservation.customerName, whatsapp: reservation.whatsapp, note: reservation.note };
}

function toPublicReservation(reservation: Reservation): PublicReservation {
  return { id: reservation.id, code: reservation.code, date: reservation.date, time: reservation.time, partySize: reservation.partySize, customerName: reservation.customerName, whatsappLast4: reservation.whatsapp.slice(-4), status: reservation.status, createdAt: reservation.createdAt, updatedAt: reservation.updatedAt };
}

function cloneReservations(): Reservation[] {
  return seedReservations.map((reservation) => ({ ...reservation, history: reservation.history.map((entry) => ({ ...entry })) }));
}

export function readReservations(): Reservation[] {
  if (isFirebaseDataMode()) return [];
  if (typeof window === 'undefined') return cloneReservations();
  try {
    const raw = window.localStorage.getItem(RESERVATIONS_KEY);
    if (!raw) return cloneReservations();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : cloneReservations();
  } catch {
    return cloneReservations();
  }
}

export async function readReservationsAsync(): Promise<Reservation[]> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return readReservations();
  const snapshot = await getDocs(collection(db, 'reservations'));
  return snapshot.docs.map((item) => item.data() as Reservation).sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
}

async function readCollection<T>(name: string, fallback: T[], activeOnly = false): Promise<T[]> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return fallback.map((item) => ({ ...item }));
  const reference = collection(db, name);
  const snapshot = await getDocs(activeOnly ? query(reference, where('active', '==', true)) : reference);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function readMomentsAsync(includeInactive = false): Promise<ServiceMoment[]> { return readCollection<ServiceMoment>('serviceMoments', demoMoments, !includeInactive); }
export async function readCategoriesAsync(includeInactive = false): Promise<MenuCategory[]> { return readCollection<MenuCategory>('menuCategories', demoCategories, !includeInactive); }
export async function readMenuItemsAsync(includeInactive = false): Promise<MenuItem[]> { return readCollection<MenuItem>('menuItems', demoMenuItems, !includeInactive); }
export async function readAreasAsync(): Promise<Area[]> { return readCollection<Area>('areas', demoAreas); }
export async function readTablesAsync(): Promise<RestaurantTable[]> { return readCollection<RestaurantTable>('tables', demoTables); }
export async function readCustomersAsync(): Promise<Customer[]> { return readCollection<Customer>('customers', demoCustomers); }
export async function readTeamAsync(): Promise<TeamMember[]> { return readCollection<TeamMember>('users', demoTeam); }

function documentSlug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'registro';
}

function requireOperationalFirebase(): NonNullable<typeof firebaseDb> {
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('Este cadastro exige o Firebase real habilitado.');
  return firebaseDb;
}

const openingHourKeys: Array<keyof RestaurantSettings['openingHours']> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function requireText(value: string, label: string, min: number, max: number): string {
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new Error(`${label} deve ter entre ${min} e ${max} caracteres.`);
  return normalized;
}

function requireUrl(value: string, label: string, max = 2048): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`${label} deve ser uma URL válida.`);
  try {
    const parsed = new URL(normalized);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error(`${label} deve ser uma URL válida.`);
  }
  return normalized;
}

function validateSettingsForWrite(value: RestaurantSettings): RestaurantSettings {
  const maxPartySize = Number(value.maxPartySize);
  const reservationLeadHours = Number(value.reservationLeadHours);
  const reservationDurationMinutes = Number(value.reservationDurationMinutes);
  if (!Number.isInteger(maxPartySize) || maxPartySize < 1 || maxPartySize > 20) throw new Error('A capacidade máxima deve ser um inteiro entre 1 e 20.');
  if (!Number.isInteger(reservationLeadHours) || reservationLeadHours < 0 || reservationLeadHours > 168) throw new Error('A antecedência deve ser um inteiro entre 0 e 168 horas.');
  if (!Number.isInteger(reservationDurationMinutes) || reservationDurationMinutes < 30 || reservationDurationMinutes > 480) throw new Error('A duração deve ser um inteiro entre 30 e 480 minutos.');
  if (!['MANUAL', 'AUTOMATIC'].includes(value.confirmationMode)) throw new Error('O modo de confirmação é inválido.');
  const openingHours = Object.fromEntries(openingHourKeys.map((key) => {
    const day = value.openingHours[key];
    if (!day || typeof day.closed !== 'boolean') throw new Error(`O horário de ${key} é inválido.`);
    if (!day.closed && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(day.open)) throw new Error(`O horário de abertura de ${key} é inválido.`);
    if (!day.closed && !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(day.close)) throw new Error(`O horário de fechamento de ${key} é inválido.`);
    return [key, { open: day.closed ? '' : day.open, close: day.closed ? '' : day.close, closed: day.closed }];
  })) as unknown as RestaurantSettings['openingHours'];
  const whatsapp = value.whatsapp.trim().replace(/\D/g, '');
  if (!/^[0-9]{10,15}$/.test(whatsapp)) throw new Error('O WhatsApp deve conter entre 10 e 15 dígitos.');
  return {
    name: requireText(value.name, 'O nome', 2, 120),
    tagline: requireText(value.tagline, 'A frase', 2, 240),
    city: requireText(value.city, 'A cidade', 2, 120),
    address: requireText(value.address, 'O endereço', 5, 240),
    whatsapp,
    timezone: requireText(value.timezone, 'O fuso horário', 3, 80),
    maxPartySize,
    reservationLeadHours,
    reservationDurationMinutes,
    confirmationMode: value.confirmationMode,
    officialMenuUrl: requireUrl(value.officialMenuUrl, 'O link oficial do cardápio'),
    onlineOrderingUrl: requireUrl(value.onlineOrderingUrl, 'O link de pedidos'),
    openingHours,
    demoMode: Boolean(value.demoMode),
  };
}

function validateContentForWrite(value: SiteContent): SiteContent {
  if (!Array.isArray(value.gallery) || value.gallery.length < 1 || value.gallery.length > 12) throw new Error('A galeria deve ter entre 1 e 12 imagens.');
  const gallery = value.gallery.map((item) => requireUrl(item, 'Cada imagem da galeria'));
  return {
    heroTitle: requireText(value.heroTitle, 'O título principal', 2, 240),
    heroSubtitle: requireText(value.heroSubtitle, 'O subtítulo', 2, 500),
    heroImageUrl: requireUrl(value.heroImageUrl, 'A imagem principal'),
    chefName: requireText(value.chefName, 'O nome do chef', 2, 120),
    chefBio: requireText(value.chefBio, 'A biografia do chef', 2, 1000),
    chefImageUrl: requireUrl(value.chefImageUrl, 'A imagem do chef'),
    quote: requireText(value.quote, 'A frase de destaque', 2, 500),
    gallery,
  };
}

export async function saveSettingsAsync(value: RestaurantSettings): Promise<RestaurantSettings> {
  const db = requireOperationalFirebase();
  const next = validateSettingsForWrite(value);
  await setDoc(doc(db, 'restaurantSettings', 'main'), next);
  return next;
}

export async function saveContentAsync(value: SiteContent): Promise<SiteContent> {
  const db = requireOperationalFirebase();
  const next = validateContentForWrite(value);
  await setDoc(doc(db, 'siteContent', 'main'), next);
  return next;
}

export async function createAreaAsync(input: Pick<Area, 'name' | 'displayOrder'>): Promise<Area> {
  const db = requireOperationalFirebase();
  const name = input.name.trim();
  const displayOrder = Number(input.displayOrder);
  if (name.length < 2 || name.length > 80) throw new Error('Informe um nome de área entre 2 e 80 caracteres.');
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999) throw new Error('A ordem da área deve ser um número inteiro entre 0 e 999.');
  const area: Area = { id: `area-${documentSlug(name)}-${makeReservationIdentity().slice(0, 8)}`, name, active: true, displayOrder };
  await setDoc(doc(db, 'areas', area.id), area);
  return area;
}

export async function createTableAsync(input: Pick<RestaurantTable, 'areaId' | 'name' | 'capacity'>): Promise<RestaurantTable> {
  const db = requireOperationalFirebase();
  const areaId = input.areaId.trim();
  const name = input.name.trim();
  const capacity = Number(input.capacity);
  if (!areaId) throw new Error('Selecione uma área para a mesa.');
  if (name.length < 1 || name.length > 60) throw new Error('Informe um nome de mesa entre 1 e 60 caracteres.');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) throw new Error('A capacidade deve ser um número inteiro entre 1 e 20.');
  const table: RestaurantTable = { id: `table-${documentSlug(name)}-${makeReservationIdentity().slice(0, 8)}`, areaId, name, capacity, active: true, state: 'AVAILABLE' };
  await setDoc(doc(db, 'tables', table.id), table);
  return table;
}

export async function readSettingsAsync(): Promise<RestaurantSettings | null> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return { ...demoSettings };
  const snapshot = await getDoc(doc(db, 'restaurantSettings', 'main'));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as Partial<RestaurantSettings>;
  const openingHours = data.openingHours;
  const requiredKeys: Array<keyof RestaurantSettings> = ['name', 'tagline', 'city', 'address', 'whatsapp', 'timezone', 'officialMenuUrl', 'onlineOrderingUrl'];
  const complete = requiredKeys.every((key) => typeof data[key] === 'string')
    && typeof data.maxPartySize === 'number'
    && typeof data.reservationLeadHours === 'number'
    && typeof data.reservationDurationMinutes === 'number'
    && (data.confirmationMode === 'MANUAL' || data.confirmationMode === 'AUTOMATIC')
    && typeof data.demoMode === 'boolean'
    && openingHours && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].every((day) => {
      const value = openingHours[day as keyof typeof openingHours];
      return value && typeof value.open === 'string' && typeof value.close === 'string' && typeof value.closed === 'boolean';
    });
  return complete ? data as RestaurantSettings : null;
}

export async function readContentAsync(): Promise<SiteContent | null> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return { ...demoContent, gallery: [...demoContent.gallery] };
  const snapshot = await getDoc(doc(db, 'siteContent', 'main'));
  return snapshot.exists() ? snapshot.data() as SiteContent : null;
}

export function writeReservations(value: Reservation[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(value));
}

export function createReservation(input: ReservationInput): Reservation {
  const current = readReservations();
  const existing = input.idempotencyKey ? current.find((item) => item.idempotencyKey === input.idempotencyKey) : undefined;
  if (existing) return existing;
  const reservation = buildReservation(input);
  if (hasLocalTableConflict(reservation, current)) throw new Error('A mesa selecionada já está ocupada neste horário.');
  const next = [reservation, ...current];
  writeReservations(next);
  return reservation;
}

export async function createReservationAsync(input: ReservationInput): Promise<Reservation | PublicReservation> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return createReservation(input);
  if (input.source === 'SITE') {
    const response = await fetch('/api/reservations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date: input.date, time: input.time, partySize: input.partySize, customerName: input.customerName, whatsapp: input.whatsapp, note: input.note, idempotencyKey: input.idempotencyKey || makeReservationIdentity() }) });
    const payload = await response.json().catch(() => ({})) as { error?: string; code?: string };
    if (!response.ok || !payload.code) throw new Error(payload.error || 'Não foi possível enviar a solicitação de reserva.');
    return payload as PublicReservation;
  }
  const idempotencyKey = input.idempotencyKey || makeReservationIdentity();
  const requestRef = doc(db, 'reservationRequests', idempotencyKey);
  return runTransaction(db, async (transaction) => {
    const request = await transaction.get(requestRef);
    if (request.exists()) {
      const requestData = request.data() as { code?: string };
      if (!requestData.code) throw new Error('Solicitação de reserva inválida.');
      const existing = await transaction.get(doc(db, 'publicReservations', requestData.code));
      if (!existing.exists()) throw new Error('Solicitação de reserva inconsistente.');
      return existing.data() as PublicReservation;
    }
    const reservation = buildReservation({ ...input, idempotencyKey });
    const settingsSnapshot = await transaction.get(doc(db, 'restaurantSettings', 'main'));
    if (!settingsSnapshot.exists()) throw new Error('Configurações de reserva não publicadas.');
    const settings = settingsSnapshot.data() as RestaurantSettings;
    const validationErrors = validateReservation(reservationValidationInput(reservation), settings);
    if (validationErrors.length) throw new Error(validationErrors[0]);
    const tableSnapshot = reservation.tableId ? await transaction.get(doc(db, 'tables', reservation.tableId)) : undefined;
    validateOperationalTable(tableSnapshot?.exists() ? tableSnapshot.data() as RestaurantTable : undefined, reservation);
    const durationMinutes = configuredReservationDuration(settingsSnapshot.data());
    const lockIds = reservationOccupiesTable(reservation) ? reservationLockIds(reservation, durationMinutes) : [];
    const locks = await Promise.all(lockIds.map((lockId) => transaction.get(doc(db, 'reservationLocks', lockId))));
    if (locks.some((lock) => lock.exists())) throw new Error('A mesa selecionada já está ocupada neste horário.');
    const reservationData = reservation as unknown as Record<string, unknown>;
    const publicData = toPublicReservation(reservation) as unknown as Record<string, unknown>;
    transaction.set(doc(db, 'reservations', reservation.id), reservationData);
    transaction.set(doc(db, 'publicReservations', reservation.code), publicData);
    transaction.set(requestRef, { idempotencyKey, reservationId: reservation.id, code: reservation.code, createdAt: reservation.createdAt });
    lockIds.forEach((lockId) => transaction.set(doc(db, 'reservationLocks', lockId), { reservationId: reservation.id, date: reservation.date, time: reservation.time, tableId: reservation.tableId, createdAt: reservation.createdAt }));
    return reservation;
  });
}

export function updateReservation(id: string, patch: Partial<Reservation>): Reservation | null {
  const current = readReservations();
  const existing = current.find((item) => item.id === id);
  if (!existing) return null;
  const nextReservation = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  if (hasLocalTableConflict(nextReservation, current)) throw new Error('A mesa selecionada já está ocupada neste horário.');
  writeReservations(current.map((item) => item.id === id ? nextReservation : item));
  return nextReservation;
}

export async function findReservationByCode(code: string): Promise<PublicReservation | null> {
  if (!isFirebaseDataMode() || !firebaseDb) {
    const found = readReservations().find((item) => item.code.toLowerCase() === code.toLowerCase());
    return found ? toPublicReservation(found) : null;
  }
  const snapshot = await getDoc(doc(firebaseDb, 'publicReservations', code.toUpperCase()));
  return snapshot.exists() ? (snapshot.data() as PublicReservation) : null;
}

export async function updateReservationAsync(id: string, patch: Partial<Reservation>): Promise<void> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) {
    updateReservation(id, patch);
    return;
  }
  const reservationRef = doc(db, 'reservations', id);
  await runTransaction(db, async (transaction) => {
    const currentSnapshot = await transaction.get(reservationRef);
    if (!currentSnapshot.exists()) throw new Error('Reserva não encontrada.');
    const current = currentSnapshot.data() as Reservation;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() } as Reservation;
    if (Object.prototype.hasOwnProperty.call(patch, 'tableId') && !patch.tableId) delete next.tableId;
    const settingsSnapshot = await transaction.get(doc(db, 'restaurantSettings', 'main'));
    if (!settingsSnapshot.exists()) throw new Error('Configurações de reserva não publicadas.');
    const settings = settingsSnapshot.data() as RestaurantSettings;
    const validationErrors = validateReservation(reservationValidationInput(next), settings);
    if (validationErrors.length) throw new Error(validationErrors[0]);
    const tableSnapshot = next.tableId ? await transaction.get(doc(db, 'tables', next.tableId)) : undefined;
    validateOperationalTable(tableSnapshot?.exists() ? tableSnapshot.data() as RestaurantTable : undefined, next);
    const durationMinutes = configuredReservationDuration(settingsSnapshot.data());
    const oldLockIds = reservationOccupiesTable(current) ? reservationLockIds(current, durationMinutes) : [];
    const nextLockIds = reservationOccupiesTable(next) ? reservationLockIds(next, durationMinutes) : [];
    const locksToRead = Array.from(new Set(nextLockIds));
    const lockSnapshots = await Promise.all(locksToRead.map((lockId) => transaction.get(doc(db, 'reservationLocks', lockId))));
    if (lockSnapshots.some((lock, index) => lock.exists() && !oldLockIds.includes(locksToRead[index]))) throw new Error('A mesa selecionada já está ocupada neste horário.');
    transaction.update(reservationRef, next as unknown as Record<string, unknown>);
    transaction.set(doc(db, 'publicReservations', next.code), toPublicReservation(next) as unknown as Record<string, unknown>);
    oldLockIds.filter((lockId) => !nextLockIds.includes(lockId)).forEach((lockId) => transaction.delete(doc(db, 'reservationLocks', lockId)));
    nextLockIds.forEach((lockId) => transaction.set(doc(db, 'reservationLocks', lockId), { reservationId: next.id, date: next.date, time: next.time, tableId: next.tableId, createdAt: next.createdAt }));
  });
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  const auth = firebaseAuth;
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !auth || !db) throw new Error('Firebase não está habilitado para este ambiente.');
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getDoc(doc(db, 'users', credential.user.uid));
  const data = profile.data() as { name?: string; role?: AdminSession['role'] } | undefined;
  if (!profile.exists() || !data?.role) {
    await signOut(auth);
    throw new Error('Este usuário ainda não possui uma função cadastrada no Baru.');
  }
  const session: AdminSession = { uid: credential.user.uid, name: data.name || credential.user.displayName || email.split('@')[0], role: data.role, demo: false };
  writeSession(session);
  return session;
}

export async function signOutAdmin(): Promise<void> {
  if (isFirebaseDataMode() && firebaseAuth) await signOut(firebaseAuth);
  writeSession(null);
}

export function watchAdminSession(listener: (session: AdminSession | null) => void): Unsubscribe {
  const auth = firebaseAuth;
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !auth || !db) {
    listener(readSession());
    return () => undefined;
  }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      writeSession(null);
      listener(null);
      return;
    }
    try {
      const profile = await getDoc(doc(db, 'users', user.uid));
      const data = profile.data() as { name?: string; role?: AdminSession['role'] } | undefined;
      if (!profile.exists() || !data?.role) {
        await signOut(auth);
        listener(null);
        return;
      }
      const session: AdminSession = { uid: user.uid, name: data.name || user.displayName || user.email?.split('@')[0] || 'Equipe Baru', role: data.role, demo: false };
      writeSession(session);
      listener(session);
    } catch {
      writeSession(null);
      listener(null);
    }
  });
}

export function readSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
    return parsed && typeof parsed.uid === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: AdminSession | null): void {
  if (typeof window === 'undefined') return;
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('baru-session-change'));
}

export function buildWhatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}
