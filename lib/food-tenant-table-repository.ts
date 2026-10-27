import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { firebaseDb, isFirebaseDataMode } from '@/lib/firebase-client';
import type { FoodTenantContext } from '@/shared/food-tenant-domain';
import type { FoodDemoTable } from '@/shared/food-demo-reservation';

function db() {
  if (!firebaseDb || !isFirebaseDataMode()) throw new Error('Firebase/Emulator não disponível.');
  return firebaseDb;
}
export async function listFoodDemoTables(context: FoodTenantContext): Promise<FoodDemoTable[]> {
  const records = await getDocs(collection(db(),'tenants',context.tenant.id,'tables'));
  return records.docs.map(d => d.data() as FoodDemoTable)
    .filter(t => t.tenantId === context.tenant.id)
    .sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
export async function saveFoodDemoTable(context: FoodTenantContext, input: {
  id?: string; name: string; capacity: number; active: boolean; state: FoodDemoTable['state'];
}): Promise<string> {
  if (!context.canManageCatalog || context.tenant.status !== 'DEMO') throw new Error('Sem permissão para editar mesas.');
  const id = input.id ?? 'mesa_' + crypto.randomUUID().replace(/-/g,'').slice(0,15);
  const name = input.name.trim();
  if (!/^[a-zA-Z0-9_-]{3,100}$/.test(id) || name.length < 2 || name.length > 80
    || !Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 20
    || typeof input.active !== 'boolean' || !['AVAILABLE','MAINTENANCE'].includes(input.state)) {
    throw new Error('Mesa inválida.');
  }
  await setDoc(doc(db(),'tenants',context.tenant.id,'tables',id),{
    id,tenantId:context.tenant.id,name,capacity:input.capacity,active:input.active,state:input.state,
  } satisfies FoodDemoTable);
  return id;
}
export async function removeFoodDemoTable(context: FoodTenantContext, id: string): Promise<void> {
  if (!context.canManageMembers || context.tenant.status !== 'DEMO' || !/^[a-zA-Z0-9_-]{3,100}$/.test(id)) throw new Error('Sem permissão para excluir mesa.');
  // Demo-only: deleting active tables with reservations is not yet supported.
  throw new Error('Exclusão desabilitada: mantenha a mesa inativa para preservar o histórico de reservas.');
}
