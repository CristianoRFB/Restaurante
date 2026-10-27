import type { FoodDemoReservationStore, FoodDemoReservation, FoodDemoReservationLock, FoodDemoTable } from '@/shared/food-demo-reservation';
import type { FoodDemoTenant } from '@/shared/food-platform-domain';
import type { FoodTenantMembership } from '@/shared/food-tenant-domain';
import { createFoodTxDocuments, getFoodTxDocument } from '@/lib/food-worker-demo-transaction';

export function makeFoodReservationTransactionStore(transaction: string): FoodDemoReservationStore {
  return {
    tenant: (id) => getFoodTxDocument(['tenants', id], transaction) as Promise<FoodDemoTenant | null>,
    platformAdmin: (uid) => getFoodTxDocument(['platformAdmins', uid], transaction),
    member: (tenantId, uid) => getFoodTxDocument(['tenants', tenantId, 'memberships', uid], transaction) as Promise<FoodTenantMembership | null>,
    table: (tenantId, tableId) => getFoodTxDocument(['tenants', tenantId, 'tables', tableId], transaction) as Promise<FoodDemoTable | null>,
    reservation: (tenantId, key) => getFoodTxDocument(['tenants', tenantId, 'reservations', key], transaction) as Promise<FoodDemoReservation | null>,
    createReservationWithLocks: (reservation: FoodDemoReservation, locks: FoodDemoReservationLock[]) => createFoodTxDocuments([
      { segments: ['tenants', reservation.tenantId, 'reservations', reservation.id], record: { ...reservation } },
      ...locks.map(lock => ({
        segments: ['tenants', reservation.tenantId, 'reservationLocks', lock.id],
        record: { ...lock },
      })),
    ], transaction),
  };
}
