import { reservations as seedReservations } from '@/lib/baru-data';
import type { Reservation } from '@/shared/baru-domain';

const RESERVATIONS_KEY = 'baru-reservations-v1';
const SESSION_KEY = 'baru-admin-session-v1';

export interface AdminSession {
  uid: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVICE';
  demo: boolean;
}

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

export function createReservation(input: Omit<Reservation, 'id' | 'code' | 'history' | 'createdAt' | 'updatedAt'>): Reservation {
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

export function updateReservation(id: string, patch: Partial<Reservation>): Reservation | null {
  const current = readReservations();
  const existing = current.find((item) => item.id === id);
  if (!existing) return null;
  const nextReservation = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  writeReservations(current.map((item) => item.id === id ? nextReservation : item));
  return nextReservation;
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
