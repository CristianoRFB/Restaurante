export type ServiceMomentId = string;
export type ReservationStatus = 'NEW' | 'CONFIRMED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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
  reservationDurationMinutes: number;
  confirmationMode: 'MANUAL' | 'AUTOMATIC';
  officialMenuUrl: string;
  onlineOrderingUrl: string;
  openingHours: OpeningHours;
  demoMode: boolean;
}

export interface OpeningHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

export interface CustomerAccount {
  uid: string;
  email: string;
  name: string;
  whatsapp?: string;
  createdAt: string;
  updatedAt: string;
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
  whatsappLast4: string;
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

const openingDayKeys: Array<keyof OpeningHours> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export interface StoreAvailability {
  isOpen: boolean;
  todayLabel: string;
  hoursLabel: string;
  nextOpeningLabel?: string;
}

function clockMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function zonedClock(date: Date, timeZone: string): { weekday: keyof OpeningHours; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  }
  const weekdayMap: Record<string, keyof OpeningHours> = { sunday: 'sunday', monday: 'monday', tuesday: 'tuesday', wednesday: 'wednesday', thursday: 'thursday', friday: 'friday', saturday: 'saturday' };
  const weekday = weekdayMap[parts.find((part) => part.type === 'weekday')?.value.toLowerCase() || 'sunday'];
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return { weekday, minutes: hour * 60 + minute };
}

function weekdayLabel(date: Date, timeZone: string): string {
  try { return new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long' }).format(date); } catch { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(date); }
}

function hoursLabel(value: OpeningHours[keyof OpeningHours] | undefined): string {
  return !value || value.closed || !value.open || !value.close ? 'Fechado hoje' : `${value.open}–${value.close}`;
}

export function getStoreAvailability(settings: Pick<RestaurantSettings, 'openingHours' | 'timezone'>, now = new Date()): StoreAvailability {
  const timeZone = settings.timezone || 'America/Sao_Paulo';
  const current = zonedClock(now, timeZone);
  const today = settings.openingHours?.[current.weekday];
  const todayOpen = today ? clockMinutes(today.open) : null;
  const todayClose = today ? clockMinutes(today.close) : null;
  const isOpenToday = Boolean(today && !today.closed && todayOpen !== null && todayClose !== null && (todayClose > todayOpen ? current.minutes >= todayOpen && current.minutes < todayClose : current.minutes >= todayOpen));
  const previous = zonedClock(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone);
  const previousHours = settings.openingHours?.[previous.weekday];
  const previousOpen = previousHours ? clockMinutes(previousHours.open) : null;
  const previousClose = previousHours ? clockMinutes(previousHours.close) : null;
  const isOpenFromPreviousNight = Boolean(previousHours && !previousHours.closed && previousOpen !== null && previousClose !== null && previousClose <= previousOpen && current.minutes < previousClose);
  if (isOpenToday || isOpenFromPreviousNight) {
    return { isOpen: true, todayLabel: 'Aberto agora', hoursLabel: hoursLabel(today || previousHours) };
  }
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const candidate = zonedClock(candidateDate, timeZone);
    const candidateHours = settings.openingHours?.[candidate.weekday];
    const candidateOpen = candidateHours ? clockMinutes(candidateHours.open) : null;
    if (!candidateHours || candidateHours.closed || candidateOpen === null) continue;
    if (offset === 0 && candidateOpen <= current.minutes) continue;
    const day = offset === 0 ? 'hoje' : weekdayLabel(candidateDate, timeZone);
    return { isOpen: false, todayLabel: 'Fechado agora', hoursLabel: hoursLabel(today), nextOpeningLabel: `Próxima abertura ${day} às ${candidateHours.open}` };
  }
  return { isOpen: false, todayLabel: 'Fechado agora', hoursLabel: hoursLabel(today), nextOpeningLabel: 'Próxima abertura não configurada' };
}

export function openingHoursForDate(date: string, settings: RestaurantSettings): OpeningHours[keyof OpeningHours] | null {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return settings.openingHours[openingDayKeys[parsed.getDay()]];
}

export function generateTimeSlots(settings: RestaurantSettings, date: string, intervalMinutes = 30): string[] {
  const opening = openingHoursForDate(date, settings);
  if (!opening || opening.closed || !/^\d{2}:\d{2}$/.test(opening.open) || !/^\d{2}:\d{2}$/.test(opening.close)) return [];
  const [openHour, openMinute] = opening.open.split(':').map(Number);
  const [closeHour, closeMinute] = opening.close.split(':').map(Number);
  const open = openHour * 60 + openMinute;
  const configuredClose = closeHour * 60 + closeMinute;
  const close = configuredClose <= open ? configuredClose + 24 * 60 : configuredClose;
  return Array.from({ length: Math.max(0, Math.ceil((close - open) / intervalMinutes)) }, (_, index) => {
    const minutes = open + index * intervalMinutes;
    const displayMinutes = minutes % (24 * 60);
    return { minutes, time: `${String(Math.floor(displayMinutes / 60)).padStart(2, '0')}:${String(displayMinutes % 60).padStart(2, '0')}` };
  }).filter(({ minutes }) => minutes < close).map(({ time }) => time);
}

export function dateKeyInTimeZone(date = new Date(), timeZone = 'America/Sao_Paulo'): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function validateReservation(input: Pick<Reservation, 'date' | 'time' | 'partySize' | 'customerName' | 'whatsapp' | 'note'>, settings: RestaurantSettings): string[] {
  const errors: string[] = [];
  const dateParts = input.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeIsValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time);
  const date = dateParts ? new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])) : new Date(Number.NaN);
  const todayKey = dateKeyInTimeZone(new Date(), settings.timezone);
  const [todayYear, todayMonth, todayDay] = todayKey.split('-').map(Number);
  const today = new Date(todayYear, todayMonth - 1, todayDay);
  if (!dateParts || Number.isNaN(date.getTime()) || date.getFullYear() !== Number(dateParts[1]) || date.getMonth() !== Number(dateParts[2]) - 1 || date.getDate() !== Number(dateParts[3])) errors.push('Escolha uma data válida.');
  else if (date < today) errors.push('A data da reserva não pode estar no passado.');
  if (!timeIsValid) errors.push('Escolha um horário válido.');
  if (timeIsValid && dateParts && !generateTimeSlots(settings, input.date).includes(input.time)) errors.push('Escolha um horário dentro do funcionamento do restaurante.');
  if (dateParts && input.date === dateKeyInTimeZone(new Date(), settings.timezone)) {
    const minimum = new Date(Date.now() + settings.reservationLeadHours * 60 * 60 * 1000);
    const selected = new Date(`${input.date}T${input.time}:00`);
    if (selected <= minimum) errors.push(`As reservas precisam ser feitas com pelo menos ${settings.reservationLeadHours} horas de antecedência.`);
  }
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
