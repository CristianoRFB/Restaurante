export type ServiceMomentId = string;
export type ReservationStatus = 'NEW' | 'CONFIRMED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ConversationStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'DONE';
export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVICE';
export type TableState = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

export interface ServiceMoment {
  id: ServiceMomentId;
  name: string;
  eyebrow: string;
  description: string;
  imageUrl: string;
  active: boolean;
  displayOrder: number;
}

export interface RestaurantSettings {
  name: string;
  tagline: string;
  city: string;
  address: string;
  whatsapp: string;
  timezone: string;
  maxPartySize: number;
  reservationLeadHours: number;
  confirmationMode: 'MANUAL' | 'AUTOMATIC';
  demoMode: boolean;
}

export interface ReservationHistoryEntry {
  id: string;
  status: ReservationStatus;
  label: string;
  createdAt: string;
  by: string;
}

export interface Reservation {
  id: string;
  code: string;
  date: string;
  time: string;
  partySize: number;
  customerId: string;
  customerName: string;
  whatsapp: string;
  note: string;
  status: ReservationStatus;
  tableId?: string;
  momentId?: ServiceMomentId;
  source: 'SITE' | 'WHATSAPP' | 'ADMIN';
  history: ReservationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  idempotencyKey?: string;
}

export interface PublicReservation {
  id: string;
  code: string;
  date: string;
  time: string;
  partySize: number;
  customerName: string;
  whatsapp: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
  tags: string[];
  preferences: string[];
  notes: string;
  importantDate?: string;
  reservationIds: string[];
  noShows: number;
  lastVisit?: string;
}

export interface Area {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
}

export interface RestaurantTable {
  id: string;
  areaId: string;
  name: string;
  capacity: number;
  active: boolean;
  state: TableState;
}

export interface MenuCategory {
  id: string;
  name: string;
  subtitle: string;
  active: boolean;
  displayOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  priceCents: number;
  imageUrl: string;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  serviceMomentIds: ServiceMomentId[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  permissions: string[];
  lastAccess: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  preview: string;
  status: ConversationStatus;
  updatedAt: string;
  messages: Array<{ id: string; text: string; from: 'CUSTOMER' | 'TEAM'; at: string }>;
}

export interface SiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  chefName: string;
  chefBio: string;
  chefImageUrl: string;
  quote: string;
  gallery: string[];
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  NEW: 'Aguardando',
  CONFIRMED: 'Confirmada',
  ARRIVED: 'Chegou',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No-show',
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Gerente',
  CASHIER: 'Caixa',
  SERVICE: 'Atendimento',
};

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function formatDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Data inválida';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
}

export function makeReservationCode(seed = Date.now()): string {
  return `BRU-${Math.abs(seed).toString(36).toUpperCase().padStart(8, '0').slice(-8)}`;
}

export function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) throw new Error('Informe um WhatsApp válido com DDD.');
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function validateReservation(input: Pick<Reservation, 'date' | 'time' | 'partySize' | 'customerName' | 'whatsapp' | 'note'>, settings: RestaurantSettings): string[] {
  const errors: string[] = [];
  const dateParts = input.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeIsValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time);
  const date = dateParts ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])) : new Date(Number.NaN);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!dateParts || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(dateParts[1]) || date.getMonth() !== Number(dateParts[2]) - 1 || date.getDate() !== Number(dateParts[3])) errors.push('Escolha uma data válida.');
  else if (date < today) errors.push('A data da reserva não pode estar no passado.');
  if (!timeIsValid) errors.push('Escolha um horário válido.');
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > settings.maxPartySize) errors.push(`Informe de 1 a ${settings.maxPartySize} pessoas.`);
  if (input.customerName.trim().length < 2 || input.customerName.trim().length > 100) errors.push('Informe seu nome completo.');
  try { normalizeWhatsapp(input.whatsapp); } catch (error) { errors.push(error instanceof Error ? error.message : 'WhatsApp inválido.'); }
  if (input.note.length > 500) errors.push('A observação deve ter no máximo 500 caracteres.');
  return errors;
}

export function reservationStatusTone(status: ReservationStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'CONFIRMED' || status === 'ARRIVED' || status === 'COMPLETED') return 'success';
  if (status === 'NEW') return 'warning';
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'danger';
  return 'neutral';
}
