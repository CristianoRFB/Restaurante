// Food CORE_FIRST: commercial leads and demonstration tenants are different entities.
// This file deliberately contains no billing or entitlement enforcement.
export type LeadStatus = 'NAO_CONVERTIDO';
export type LeadContractStatus = 'NOT_SIGNED';
export type TenantRole = 'tenant_owner' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SERVICE';

export interface FoodLead {
  id: string;
  name: string;
  vertical: 'FOOD';
  source: 'repositorio_legado' | 'cadastro_manual';
  sourceUrl: string;
  status: LeadStatus;
  contractStatus: LeadContractStatus;
  brandingAuthorization: 'UNCONFIRMED';
  createdAt: string;
  updatedAt: string;
  demoTenantId?: string;
}

export interface FoodDemoTenant {
  id: string;
  slug: string;
  linkedLeadId: string;
  kind: 'DEMO';
  status: 'DEMO' | 'SUSPENDED';
  subscriptionStatus: 'demo';
  planId: 'PREMIUM_DEMO';
  publiclyListed: false;
  branding: { name: string; tagline: string; primaryColor: string };
  createdAt: string;
  updatedAt: string;
}

export const BARU_LEAD_NAME = 'Baru Gastronomia';
export const BARU_SOURCE_URL = 'https://github.com/CristianoRFB/Restaurante';

export function foodSlug(value: string): string {
  const slug = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3) {
    throw new Error('Nome inválido para identificador de lead.');
  }
  if (['admin', 'platform', 'api', 'tenants', 'demo', 'system'].includes(slug)) {
    throw new Error('Identificador reservado.');
  }
  return slug;
}

export function newFoodLead(name: string, source: FoodLead['source'], sourceUrl: string, now: string): FoodLead {
  const cleaned = name.trim();
  if (cleaned.length < 3 || cleaned.length > 120) throw new Error('Nome comercial deve ter de 3 a 120 caracteres.');
  if (sourceUrl && (!sourceUrl.startsWith('https://') || sourceUrl.length > 2048)) {
    throw new Error('Referência deve ser URL HTTPS.');
  }
  if (!Number.isFinite(Date.parse(now))) throw new Error('Data de registro inválida.');
  return {
    id: foodSlug(cleaned), name: cleaned, vertical: 'FOOD', source, sourceUrl,
    status: 'NAO_CONVERTIDO', contractStatus: 'NOT_SIGNED',
    brandingAuthorization: 'UNCONFIRMED', createdAt: now, updatedAt: now,
  };
}

export function newFoodDemoTenant(lead: FoodLead, now: string): FoodDemoTenant {
  const id = `${lead.id}-demo`;
  if (id.length > 63) throw new Error('Slug de tenant fora do limite.');
  return {
    id, slug: id, linkedLeadId: lead.id, kind: 'DEMO', status: 'DEMO',
    subscriptionStatus: 'demo', planId: 'PREMIUM_DEMO', publiclyListed: false,
    // Never publish a prospect's logo/name as authorized demo branding automatically.
    branding: {
      name: 'Restaurante — Demonstração',
      tagline: 'Ambiente fictício de apresentação; não é o sistema oficial do estabelecimento.',
      primaryColor: '#315742',
    },
    createdAt: now, updatedAt: now,
  };
}
