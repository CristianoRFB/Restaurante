import { reservations as seedReservations } from '@/lib/baru-data';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import type { Reservation } from '@/shared/baru-domain';

const RESERVATIONS_KEY = 'baru-reservations-v1';
const SESSION_KEY = 'baru-admin-session-v1';

export interface AdminSession {
  uid: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVICE';
  demo: boolean;
}

export type ReservationInput = Omit<Reservation, 'id' | 'code' | 'history' | 'createdAt' | 'updatedAt'>;

function cloneReservations(): Reservation[] {
  return seedReservations.map((reservation) => ({ ...reservation, history: reservation.history.map((entry) => ({ ...entry })) }));
}

export function readReservations(): Reservation[] {
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

export function writeReservations(value: Reservation[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(value));
}

export function createReservation(input: ReservationInput): Reservation {
  const now = new Date().toISOString();
  const reservation: Reservation = {
    ...input,
    id: `res-${crypto.randomUUID()}`,
    code: `BRU-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    history: [{ id: crypto.randomUUID(), status: input.status, label: 'Reserva criada', createdAt: now, by: 'Site' }],
    createdAt: now,
    updatedAt: now,
  };
  const next = [reservation, ...readReservations()];
  writeReservations(next);
  return reservation;
}

export async function createReservationAsync(input: ReservationInput): Promise<Reservation> {
  if (!isFirebaseDataMode() || !firebaseDb) return createReservation(input);
  const now = new Date().toISOString();
  const reservation: Reservation = {
    ...input,
    id: `res-${crypto.randomUUID()}`,
    code: `BRU-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    history: [{ id: crypto.randomUUID(), status: input.status, label: 'Reserva criada', createdAt: now, by: 'Site' }],
    createdAt: now,
    updatedAt: now,
  };
  const batch = writeBatch(firebaseDb);
  batch.set(doc(firebaseDb, 'reservations', reservation.id), reservation);
  batch.set(doc(firebaseDb, 'publicReservations', reservation.code), reservation);
  await batch.commit();
  return reservation;
}

export function updateReservation(id: string, patch: Partial<Reservation>): Reservation | null {
  const current = readReservations();
  const existing = current.find((item) => item.id === id);
  if (!existing) return null;
  const nextReservation = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  writeReservations(current.map((item) => item.id === id ? nextReservation : item));
  return nextReservation;
}

export async function findReservationByCode(code: string): Promise<Reservation | null> {
  if (!isFirebaseDataMode() || !firebaseDb) return readReservations().find((item) => item.code.toLowerCase() === code.toLowerCase()) || null;
  const snapshot = await getDoc(doc(firebaseDb, 'publicReservations', code.toUpperCase()));
  return snapshot.exists() ? (snapshot.data() as Reservation) : null;
}

export async function updateReservationAsync(id: string, patch: Partial<Reservation>): Promise<void> {
  if (!isFirebaseDataMode() || !firebaseDb) {
    updateReservation(id, patch);
    return;
  }
  const reservationRef = doc(firebaseDb, 'reservations', id);
  const current = await getDoc(reservationRef);
  if (!current.exists()) throw new Error('Reserva não encontrada.');
  const next = { ...current.data(), ...patch, updatedAt: new Date().toISOString() } as Reservation;
  const batch = writeBatch(firebaseDb);
  const firestoreData = next as unknown as Record<string, unknown>;
  batch.update(reservationRef, firestoreData);
  batch.set(doc(firebaseDb, 'publicReservations', next.code), firestoreData, { merge: true });
  await batch.commit();
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  if (!isFirebaseDataMode() || !firebaseAuth || !firebaseDb) throw new Error('Firebase não está habilitado para este ambiente.');
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const profile = await getDoc(doc(firebaseDb, 'users', credential.user.uid));
  const data = profile.data() as { name?: string; role?: AdminSession['role'] } | undefined;
  if (!profile.exists() || !data?.role) {
    await signOut(firebaseAuth);
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
