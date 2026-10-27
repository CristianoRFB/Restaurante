import { doc, updateDoc } from 'firebase/firestore';
import { firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import { resolveFoodTenant } from '@/lib/food-tenant-repository';
import { validatedDemoBranding } from '@/shared/food-demo-branding';
import type { FoodDemoBranding } from '@/shared/food-platform-domain';

export async function saveFoodDemoBranding(slug: string, input: FoodDemoBranding): Promise<void> {
  const context = await resolveFoodTenant(slug);
  if (!context.canManageMembers || context.tenant.status !== 'DEMO') {
    throw new Error('Apenas o dono da demo ou Platform Owner pode editar identidade ativa.');
  }
  if (!isFirebaseDataMode() || !firebaseDb) throw new Error('Firebase indisponível.');
  const branding = validatedDemoBranding(input);
  // The Firestore Rules restrict tenant_owner updates to branding+updatedAt only.
  await updateDoc(doc(firebaseDb,'tenants',context.tenant.id), {
    branding,
    updatedAt: new Date().toISOString(),
  });
}
