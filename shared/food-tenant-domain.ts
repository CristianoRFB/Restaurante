import type { FoodDemoTenant, TenantRole } from '@/shared/food-platform-domain';

// Food tenant catalog is deliberately separate from the restaurant's legacy global collections.
export interface FoodTenantMembership { uid: string; role: TenantRole; active: boolean; }
export interface FoodTenantMenuItem {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  categoryId: string;
  priceCents: number;
  active: boolean;
}
export type FoodMenuInput = Pick<FoodTenantMenuItem, 'name' | 'description' | 'categoryId' | 'priceCents' | 'active'>;
export interface FoodTenantContext {
  tenant: FoodDemoTenant;
  uid: string;
  isPlatformOwner: boolean;
  membership: FoodTenantMembership | null;
  canManageCatalog: boolean;
  canManageMembers: boolean;
}

export function validFoodTenantSlug(slug: string): boolean {
  return /^[a-z][a-z0-9-]{2,62}$/.test(slug) && !slug.includes('--');
}

export function canManageFoodCatalog(role: TenantRole | null): boolean {
  return role === 'tenant_owner' || role === 'ADMIN' || role === 'MANAGER';
}

export function buildFoodTenantMenuItem(tenantId: string, itemId: string, input: FoodMenuInput): FoodTenantMenuItem {
  if (!validFoodTenantSlug(tenantId)) throw new Error('Tenant inválido.');
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(itemId)) throw new Error('Identificador de produto inválido.');
  const name = input.name.trim();
  const description = input.description.trim();
  const categoryId = input.categoryId.trim();
  if (name.length < 2 || name.length > 120) throw new Error('Nome deve ter entre 2 e 120 caracteres.');
  if (description.length > 500) throw new Error('Descrição acima de 500 caracteres.');
  if (!categoryId || categoryId.length > 100) throw new Error('Categoria inválida.');
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 10_000_000) throw new Error('Preço inválido em centavos.');
  if (typeof input.active !== 'boolean') throw new Error('Disponibilidade inválida.');
  return { id: itemId, tenantId, name, description, categoryId, priceCents: input.priceCents, active: input.active };
}

export function parseFoodReaisToCents(raw: string): number {
  // BRL decimal input, stored strictly in integer cents.
  const value = raw.trim().replace(',', '.');
  if (!/^(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/.test(value)) throw new Error('Informe preço em reais com até duas casas decimais.');
  const [whole, decimals = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 10_000_000) throw new Error('Preço supera o limite permitido.');
  return cents;
}
