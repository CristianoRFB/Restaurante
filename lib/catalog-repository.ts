import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import type { MenuCategory, MenuItem, ServiceMoment } from '@/shared/baru-domain';
import type { OrderModifier, OrderModifierGroup } from '@/shared/order-domain';

function requireDb() {
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('Este cadastro exige o Firebase real habilitado.');
  return firebaseDb;
}

function idPart(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
}

function randomPart(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 10);
}

function text(value: string, label: string, min: number, max: number): string {
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new Error(`${label} deve ter entre ${min} e ${max} caracteres.`);
  return normalized;
}

function imageUrl(value: string): string {
  const normalized = text(value, 'A imagem', 1, 2048);
  try { const url = new URL(normalized); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { throw new Error('A imagem deve ser uma URL HTTP ou HTTPS.'); }
  return normalized;
}

export async function saveMenuCategoryAsync(input: Pick<MenuCategory, 'id' | 'name' | 'subtitle' | 'active' | 'displayOrder'>): Promise<MenuCategory> {
  const db = requireDb();
  const category: MenuCategory = { id: input.id || `category-${idPart(input.name)}-${randomPart()}`, name: text(input.name, 'O nome da categoria', 2, 100), subtitle: text(input.subtitle, 'O subtítulo da categoria', 2, 240), active: Boolean(input.active), displayOrder: Number(input.displayOrder) };
  if (!Number.isSafeInteger(category.displayOrder) || category.displayOrder < 0 || category.displayOrder > 999) throw new Error('A ordem da categoria deve ser um inteiro entre 0 e 999.');
  await setDoc(doc(db, 'menuCategories', category.id), category);
  return category;
}

export async function saveMenuItemAsync(input: Omit<MenuItem, 'id'> & { id?: string; modifierGroupIds?: string[] }): Promise<MenuItem & { modifierGroupIds?: string[] }> {
  const db = requireDb();
  const priceCents = Number(input.priceCents);
  const item = { id: input.id || `item-${idPart(input.name)}-${randomPart()}`, name: text(input.name, 'O nome do item', 2, 120), description: text(input.description, 'A descrição', 2, 500), categoryId: text(input.categoryId, 'A categoria', 1, 120), priceCents, imageUrl: imageUrl(input.imageUrl), active: Boolean(input.active), featured: Boolean(input.featured), displayOrder: Number(input.displayOrder), serviceMomentIds: Array.isArray(input.serviceMomentIds) ? input.serviceMomentIds.filter((id): id is string => typeof id === 'string').slice(0, 20) : [], ...(Array.isArray(input.modifierGroupIds) && input.modifierGroupIds.length ? { modifierGroupIds: input.modifierGroupIds.filter((id): id is string => typeof id === 'string').slice(0, 20) } : {}) };
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > 10_000_000) throw new Error('O preço deve ser um valor inteiro em centavos entre 0 e 10000000.');
  if (!Number.isSafeInteger(item.displayOrder) || item.displayOrder < 0 || item.displayOrder > 9999) throw new Error('A ordem do item é inválida.');
  await setDoc(doc(db, 'menuItems', item.id), item);
  return item;
}

export async function readCatalogMomentsAsync(): Promise<ServiceMoment[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, 'serviceMoments'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ServiceMoment).filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function readModifierGroupsAsync(): Promise<OrderModifierGroup[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, 'modifierGroups'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderModifierGroup).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export async function readModifiersAsync(): Promise<OrderModifier[]> {
  const db = requireDb();
  const snapshot = await getDocs(collection(db, 'modifiers'));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as OrderModifier).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export async function saveModifierAsync(input: Partial<OrderModifier> & Pick<OrderModifier, 'name'>): Promise<OrderModifier> {
  const db = requireDb();
  const priceCents = Number(input.priceCents ?? 0);
  const modifier: OrderModifier = { id: input.id || `modifier-${idPart(input.name)}-${randomPart()}`, name: text(input.name, 'O nome do adicional', 2, 100), active: input.active !== false, available: input.available !== false, priceCents, ...(input.maxQuantity ? { maxQuantity: Number(input.maxQuantity) } : {}), displayOrder: Number(input.displayOrder ?? 0) };
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > 1_000_000) throw new Error('O preço do adicional é inválido.');
  await setDoc(doc(db, 'modifiers', modifier.id), modifier);
  return modifier;
}

export async function saveModifierGroupAsync(input: Partial<OrderModifierGroup> & Pick<OrderModifierGroup, 'name'>): Promise<OrderModifierGroup> {
  const db = requireDb();
  const group: OrderModifierGroup = { id: input.id || `group-${idPart(input.name)}-${randomPart()}`, name: text(input.name, 'O nome do grupo', 2, 100), description: input.description?.trim().slice(0, 240) || '', active: input.active !== false, required: Boolean(input.required), minSelections: Number(input.minSelections ?? 0), maxSelections: Number(input.maxSelections ?? 1), allowDuplicate: Boolean(input.allowDuplicate), ...(input.maxPerModifier ? { maxPerModifier: Number(input.maxPerModifier) } : {}), modifierIds: Array.isArray(input.modifierIds) ? input.modifierIds.filter((id): id is string => typeof id === 'string').slice(0, 30) : [], displayOrder: Number(input.displayOrder ?? 0) };
  if (!Number.isSafeInteger(group.minSelections) || !Number.isSafeInteger(group.maxSelections) || group.minSelections < 0 || group.maxSelections < 1 || group.minSelections > group.maxSelections || group.maxSelections > 30) throw new Error('Limites de seleção do grupo são inválidos.');
  await setDoc(doc(db, 'modifierGroups', group.id), group);
  return group;
}
