import { collection, doc, getDoc, getDocs, runTransaction, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import {
  BARU_LEAD_NAME, BARU_SOURCE_URL, newFoodDemoTenant, newFoodLead,
  type FoodLead, type FoodDemoTenant,
} from '@/shared/food-platform-domain';

function dbRequired() {
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('Plataforma exige Firebase real ou Emulator; sem modo seed silencioso.');
  return firebaseDb;
}

function operatorUid(): string {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Autentique-se antes de operar leads.');
  return uid;
}

export async function isFoodPlatformOwner(uid: string): Promise<boolean> {
  const db = dbRequired();
  const owner = await getDoc(doc(db, 'platformAdmins', uid));
  return owner.exists() && owner.data().role === 'platform_owner' && owner.data().active === true;
}

async function requirePlatformOwner() {
  const uid = operatorUid();
  if (!await isFoodPlatformOwner(uid)) throw new Error('Apenas Platform Owner pode operar leads.');
}

export async function getFoodLeads(): Promise<FoodLead[]> {
  await requirePlatformOwner();
  const snapshot = await getDocs(collection(dbRequired(), 'platformLeads'));
  return snapshot.docs.map((item) => item.data() as FoodLead).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function createFoodLeadRecord(name: string, source: FoodLead['source'], sourceUrl = ''): Promise<string> {
  await requirePlatformOwner();
  const db = dbRequired();
  const lead = newFoodLead(name, source, sourceUrl, new Date().toISOString());
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, 'platformLeads', lead.id);
    const previous = await transaction.get(ref);
    if (previous.exists()) throw new Error('Lead já cadastrado. Nenhum registro existente foi sobrescrito.');
    transaction.set(ref, lead);
  });
  return lead.id;
}

export function registerBaruProspect(): Promise<string> {
  return createFoodLeadRecord(BARU_LEAD_NAME, 'repositorio_legado', BARU_SOURCE_URL);
}

// Idempotent and atomic: a lead is never converted to a paying customer.
export async function ensureFoodDemoForLead(leadId: string): Promise<string> {
  await requirePlatformOwner();
  const db = dbRequired();
  return runTransaction(db, async (transaction) => {
    const leadRef = doc(db, 'platformLeads', leadId);
    const snapshot = await transaction.get(leadRef);
    if (!snapshot.exists()) throw new Error('Lead não encontrado.');
    const lead = snapshot.data() as FoodLead;
    if (lead.status !== 'NAO_CONVERTIDO' || lead.contractStatus !== 'NOT_SIGNED') {
      throw new Error('Status comercial incompatível com demo.');
    }
    const now = new Date().toISOString();
    const draft = newFoodDemoTenant(lead, now);
    const tenantRef = doc(db, 'tenants', draft.id);
    const current = await transaction.get(tenantRef);
    if (current.exists()) {
      const existing = current.data() as FoodDemoTenant;
      if (existing.linkedLeadId !== leadId || existing.kind !== 'DEMO') throw new Error('Conflito de slug de demo.');
    } else {
      transaction.set(tenantRef, draft);
    }
    if (lead.demoTenantId && lead.demoTenantId !== draft.id) throw new Error('Lead já associado a outra demo.');
    if (!lead.demoTenantId) transaction.update(leadRef, { demoTenantId: draft.id, updatedAt: now });
    return draft.id;
  });
}

export async function toggleFoodDemo(tenantId: string, suspend: boolean): Promise<void> {
  await requirePlatformOwner();
  const db = dbRequired();
  const ref = doc(db, 'tenants', tenantId);
  const existing = await getDoc(ref);
  if (!existing.exists() || existing.data().kind !== 'DEMO') throw new Error('Tenant demo não encontrado.');
  await updateDoc(ref, { status: suspend ? 'SUSPENDED' : 'DEMO', updatedAt: new Date().toISOString() });
}
