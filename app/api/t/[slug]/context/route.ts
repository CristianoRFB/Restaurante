import { FoodTenantAccessError, resolveTrustedFoodWorkerContext } from '@/shared/food-worker-tenant';
import { FoodWorkerAuthError, getPrivateFoodDocument, verifyFoodFirebaseBearer } from '@/lib/food-worker-firebase';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store, private' };
  try {
    const uid = await verifyFoodFirebaseBearer(request);
    const context = await resolveTrustedFoodWorkerContext(params.slug, uid, {
      tenant: async (slug) => (await getPrivateFoodDocument(['tenants', slug])) as Awaited<ReturnType<typeof tenantDocument>> | null,
      platformAdmin: (user) => getPrivateFoodDocument(['platformAdmins', user]),
      member: async (slug, user) => (await getPrivateFoodDocument(['tenants', slug, 'memberships', user])) as Awaited<ReturnType<typeof memberDocument>> | null,
    });
    return new Response(JSON.stringify({
      tenantId: context.tenantId, slug: context.slug, status: context.status,
      branding: context.branding, permissions: context.permissions,
    }), { status: 200, headers });
  } catch (error) {
    if (error instanceof FoodWorkerAuthError || (error instanceof FoodTenantAccessError && error.code === 'UNAUTHORIZED')) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401, headers });
    }
    if (error instanceof FoodTenantAccessError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.code === 'NOT_FOUND' ? 404 : 403, headers });
    }
    // Avoid leaking service secrets or upstream HTTP response contents.
    return new Response(JSON.stringify({ error: 'Serviço temporariamente indisponível.' }), { status: 503, headers });
  }
}

// Type-only return helpers; no runtime Firestore calls.
async function tenantDocument(): Promise<import('@/shared/food-platform-domain').FoodDemoTenant> { throw new Error('type-only'); }
async function memberDocument(): Promise<import('@/shared/food-tenant-domain').FoodTenantMembership> { throw new Error('type-only'); }
