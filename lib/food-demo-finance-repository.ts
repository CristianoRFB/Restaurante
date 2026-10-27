import { collection, getDocs, limit, query } from 'firebase/firestore';
import { firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import type { FoodDemoOrder } from '@/shared/food-demo-order';
import type { FoodTenantContext } from '@/shared/food-tenant-domain';
import { canViewFoodDemoFinance, summarizeFoodDemoFinance } from '@/shared/food-demo-finance';

export async function readFoodDemoFinance(ctx: FoodTenantContext) {
  if (!canViewFoodDemoFinance(ctx)) throw new Error('Sem permissão de caixa/gerência para consultar esta demonstração.');
  if (!firebaseDb || !isFirebaseDataMode()) throw new Error('Firebase indisponível.');
  // No collectionGroup, no root collections, no cross-tenant query and no billing data.
  const snapshot = await getDocs(query(collection(firebaseDb, 'tenants', ctx.tenant.id, 'orders'), limit(100)));
  const orders = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as FoodDemoOrder));
  const summary = summarizeFoodDemoFinance(ctx.tenant.id, orders, snapshot.size >= 100);
  return { summary, orders: [...orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20) };
}
