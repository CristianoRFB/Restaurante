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

- Login de equipe específico por tenant em `/t/[slug]/login` e prévia de catálogo agora utilizando o mesmo `resolveFoodTenant` e Rules que o admin; sem reaproveitar sessões locais inseguras do legado.
- Não há checkout demo ligado e a UI exige sessão autenticada. O CI de build/Rules é validação de código, não prova de browser ou produção.

- Fronteira **read-only** no Worker: `GET /api/t/[slug]/context` verifica Firebase ID token contra Identity Toolkit, consulta tenant e ACL com credencial de serviço já prevista no Worker e rejeita acesso cruzado, revogado ou suspenso. Testes unitários do resolver em `tests/food-worker-tenant.test.ts`.
- Importante: o endpoint de contexto NÃO conclui os pedidos ou reservas. Ainda falta adaptar handlers de escrita com autorização/isolamento repetidos em cada transação, e teste de integração real do Worker.

- Pedidos DEMO isolados: `POST /api/t/[slug]/orders` e `/t/[slug]/checkout` com preço de produtos lido pelo Worker, criação condicional atômica no Firestore Emulator, replay idempotente por `clientRequestId`, ausência de cobrança e carrinho isolado. Suite REST Emulator: `tests/food-worker-firestore.integration.test.ts` validada no CI #40552277981. Isso **não** significa pedidos, caixa ou reservas do Baru migrados.
- Leitura privada do contexto Worker no modo Emulator utiliza localhost/projeto `demo-`; o ambiente legado permanece intocado.

- Reserva DEMO tenant-aware: `POST /api/t/[slug]/reservations`, `/t/[slug]/reservations`, `/t/[slug]/tables`; mesa/capacidade/ACL de tenant lidas no Worker, bloqueios de três slots de 30 min criados atomicamente com reserva no Firestore Emulator. Replays idempotentes e colisões A×B cobertos por unit + REST Emulator; CI #40563938285 passou. QRs são **privados**, exigem autenticação e não são links comerciais.
- Mesas DEMO na coleção `tenants/{tenantId}/tables` com Security Rules de acesso por tenant e CRUD gestor. Seed sintético A/B inclui mesas. Não executado em Firebase real.
- QR/checkout/reservas ainda não passaram por E2E autenticado no navegador. Reserva real, horários configuráveis, cancelamento, conflitos de fuso/horário de verão, pagamentos, atendimento e caixas continuam pendentes.

- F1 migração limitada e reversível: `scripts/migrate-food-legacy.mts` (DRY_RUN por padrão), `shared/food-legacy-migration.ts`, manifesto SHA-256, transações por documento, preflight anti-sobrescrita e rollback com detecção de drift. Suíte Emulator verifica reaplicação, isolamento A×B e manutenção da origem. Não lê produção ou transfere dados pessoais.
- F3 financeiro apenas DEMO: `/t/[slug]/finance` soma pedidos simulados (não pagamentos). Firestore Rules só permitem listagem a caixa, gerência, administrador/dono e Platform Owner; acesso cruzado e papel SERVICE negados. Não há recebimento, conciliação, estorno ou fechamento.
- Checkpoint de escopo: `docs/PRE_PC_COMPLETENESS.md` atualizado para **8 / 12 = 66,7%** somente de contratos técnicos; não significa que Food esteja pronto para produção.

- Autenticação e operações HTTP autenticadas testadas com Auth Emulator + Firestore Emulator no mesmo CI: `tests/food-worker-http.integration.test.ts` chama diretamente as rotas `/api/t/[slug]/context`, `orders` e `reservations` com tokens reais do Auth Emulator. Nega 401/403, membro revogado, tenant A×B, adulteração de preço/tenant, colisão de horário e suspensão. Não é E2E de browser nem prova de deploy.
- Branding white-label **privado** por tenant: `/t/[slug]/branding`, `shared/food-demo-branding.ts` e Rules. Nome, tagline, cor principal, cor de fundo, cor de detalhe e estilo tipográfico; `tenant_owner` só altera `branding` e `updatedAt`, nunca contrato, plano, lead, slug, suspensão ou publicação; testes Rules e unitários no CI #40583424818.
- Continua proibido copiar logotipos/contatos ou publicar identidade visual do prospect Baru como se tivesse autorizado; status comercial segue NOT_SIGNED.

## Next required implementation in the same GOAL

1. Attach the `tenants` resolver to public/admin routes using trusted context.
2. Replace global repository collections with tenant-aware repository paths, preserving original data and reversible migration.
3. Secure Cloudflare order/reservation APIs and KV locks by tenant; test negative IDOR and A/B.
4. Implement tenant demo catalog/cart/checkout with server-authorized writes, no real external side effects.
5. Finish tenant admin UI, QA, visual docs and manifests from the approved GOAL; do not assume current reference PNGs are screenshots of this branch.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run build` and verify the workflow for this branch's final SHA. The isolated namespace has negative tests in `tests/food-platform.rules.test.ts` and domain tests in `tests/food-platform-domain.test.ts`.
