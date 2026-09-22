import { areas as demoAreas, categories as demoCategories, content as demoContent, customers as demoCustomers, menuItems as demoMenuItems, moments as demoMoments, reservations as seedReservations, settings as demoSettings, tables as demoTables, team as demoTeam } from '@/lib/baru-data';
import { collection, doc, getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type Unsubscribe } from 'firebase/auth';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import type { Area, Customer, MenuCategory, MenuItem, PublicReservation, Reservation, RestaurantSettings, RestaurantTable, ServiceMoment, SiteContent, TeamMember } from '@/shared/baru-domain';

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
  const duration = Number(data?.reservationDurationMinutes ?? demoSettings.reservationDurationMinutes);
  return Number.isFinite(duration) && duration > 0 ? duration : demoSettings.reservationDurationMinutes;
}

function hasLocalTableConflict(reservation: Pick<Reservation, 'date' | 'time' | 'tableId' | 'status'>, current: Reservation[]): boolean {
  if (!reservationOccupiesTable(reservation)) return false;
  const nextLocks = new Set(reservationLockIds(reservation));
  return current.some((item) => reservationOccupiesTable(item) && item.id !== (reservation as Reservation).id && reservationLockIds(item).some((lock) => nextLocks.has(lock)));
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

async function readCollection<T>(name: string, fallback: T[]): Promise<T[]> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return fallback.map((item) => ({ ...item }));
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function readMomentsAsync(): Promise<ServiceMoment[]> { return readCollection<ServiceMoment>('serviceMoments', demoMoments); }
export async function readCategoriesAsync(): Promise<MenuCategory[]> { return readCollection<MenuCategory>('menuCategories', demoCategories); }
export async function readMenuItemsAsync(): Promise<MenuItem[]> { return readCollection<MenuItem>('menuItems', demoMenuItems); }
export async function readAreasAsync(): Promise<Area[]> { return readCollection<Area>('areas', demoAreas); }
export async function readTablesAsync(): Promise<RestaurantTable[]> { return readCollection<RestaurantTable>('tables', demoTables); }
export async function readCustomersAsync(): Promise<Customer[]> { return readCollection<Customer>('customers', demoCustomers); }
export async function readTeamAsync(): Promise<TeamMember[]> { return readCollection<TeamMember>('users', demoTeam); }

export async function readSettingsAsync(): Promise<RestaurantSettings> {
  const db = firebaseDb;
  if (!isFirebaseDataMode() || !db) return { ...demoSettings };
  const snapshot = await getDoc(doc(db, 'restaurantSettings', 'main'));
  return snapshot.exists() ? { ...demoSettings, ...snapshot.data(), openingHours: { ...demoSettings.openingHours, ...(snapshot.data().openingHours || {}) } } as RestaurantSettings : { ...demoSettings, demoMode: false };
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
    const durationMinutes = configuredReservationDuration(settingsSnapshot.exists() ? settingsSnapshot.data() : undefined);
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
    const settingsSnapshot = await transaction.get(doc(db, 'restaurantSettings', 'main'));
    const durationMinutes = configuredReservationDuration(settingsSnapshot.exists() ? settingsSnapshot.data() : undefined);
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
