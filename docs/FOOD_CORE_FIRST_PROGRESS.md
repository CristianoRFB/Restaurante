# Food Multi-Tenant Core — foundation checkpoint

- Source: `CristianoRFB/Restaurante`, branch `codex/food-core-leads-demo-foundation`.
- Goal phase: **CORE_FIRST**. Existing Baru production paths and external deployment were not migrated.
- The prospect **Baru Gastronomia** is **NAO_CONVERTIDO / NOT_SIGNED**; the GitHub repo is evidence of previously built software, not a contract or authorization to use the business's brand publicly.
- `platformLeads` and `tenants` are separate. `tenants/{tenantId}/memberships/{uid}` and `tenants/{tenantId}/menuItems/{itemId}` form a new *isolated* namespace.
- `platformAdmins/{uid}` is **server-provisioned only**: no client can bootstrap `platform_owner`. Provision exclusively through emulator/Admin SDK in approved environments; never install or publish a default owner password.
- `/platform/leads` allows authorized owners to create leads, provision idempotent **private** demos and suspend/reactivate them. This is a real Firestore-backed administrative slice, **not yet a public demo/checkout**.
- The current `lib/baru-repository.ts`, `app/api/orders`, `app/api/reservations`, legacy root collections and Cloudflare KV still belong to the existing single-restaurant runtime. They MUST be migrated and tenant-scoped before any demo checkout or public tenant URL is enabled.
- Existing legacy `users/{uid}` roles are NOT platform owners, and no global billing/entitlement engine was added.
- No production Firebase, Cloudflare deploy, data import, real-world notifications or real client changes were performed by this change.

## Implementado nesta continuação

- Catálogo multi-tenant de demonstração com CRUD real via Firestore: `/t/[slug]/admin`, `lib/food-tenant-repository.ts`, `shared/food-tenant-domain.ts`.
- Resolver de contexto do tenant com uid/membership persistidos no Firestore, login obrigatório, suspensão e checagem de papel; a camada cliente não é fonte final de autorização.
- `tenant_owner` pode provisionar/revogar funcionários SERVICE/CASHIER/MANAGER apenas no próprio tenant; `ADMIN` e `tenant_owner` só via Platform Owner, conforme Rules.
- Testes negativos A×B de memberships, spoof do tenantId e catálogo. Segue sendo CORE_FIRST, sem checkout público ou servidor tenant-aware.

## Next required implementation in the same GOAL

1. Attach the `tenants` resolver to public/admin routes using trusted context.
2. Replace global repository collections with tenant-aware repository paths, preserving original data and reversible migration.
3. Secure Cloudflare order/reservation APIs and KV locks by tenant; test negative IDOR and A/B.
4. Implement tenant demo catalog/cart/checkout with server-authorized writes, no real external side effects.
5. Finish tenant admin UI, QA, visual docs and manifests from the approved GOAL; do not assume current reference PNGs are screenshots of this branch.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run build` and verify the workflow for this branch's final SHA. The isolated namespace has negative tests in `tests/food-platform.rules.test.ts` and domain tests in `tests/food-platform-domain.test.ts`.
