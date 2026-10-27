# PRE-PC COMPLETENESS — Food (CORE_FIRST)

Checkpoint anterior: `5d71a6c`. Continuado na branch `codex/food-core-leads-demo-foundation`.

Não confundir a maturidade do site Baru (single-tenant legado) com a prontidão do SaaS Food multi-tenant. Não houve deploy, escrita em produção, migração real, cliente pagante criado ou contratação de serviços.

## Contrato fixo de pontuação

12 resultados técnicos de peso igual: CODE_COMPLETE = 1 quando existe comportamento demonstrável e teste apropriado; PARTIAL = 0,5; MISSING = 0. Testes em CI/emulator não equivalem a homologação em navegador ou produção.

| # | Módulo multi-tenant | Evidência | Estado | Peso |
|---|---|---|---|---:|
| 1 | Lead comercial distinto do demo | `lib/food-platform-repository.ts`, `app/platform/leads/page.tsx`, unit tests | CODE_COMPLETE interno | 1 |
| 2 | Namespaces isolados A/B | `firestore.rules`, `tests/food-platform.rules.test.ts` | CODE_COMPLETE demo | 1 |
| 3 | Memberships/RBAC/revogação de staff | `lib/food-tenant-repository.ts`, `app/t/[slug]/admin/page.tsx`, Rules | CODE_COMPLETE demo | 1 |
| 4 | CRUD catálogo demo por tenant | `shared/food-tenant-domain.ts`, repository, Rules/unit tests | CODE_COMPLETE demo | 1 |
| 5 | Login por tenant e prévia de catálogo | `app/t/[slug]/login/page.tsx`, `app/t/[slug]/page.tsx` — falta E2E | PARTIAL | 0,5 |
| 6 | Resolver tenant seguro no Worker | `shared/food-worker-tenant.ts`, `app/api/t/[slug]/context/route.ts`, unitário; falta conectar writes | PARTIAL | 0,5 |
| 7 | Migração legado para tenants com DRY_RUN/rollback | `shared/food-legacy-migration.ts`, CLI e testes no Emulator; somente cardápio e mesas sintéticos, sem dados reais | PARTIAL | 0,5 |
| 8 | Orders por tenant, preço servidor/idempotência | `app/api/t/[slug]/orders/route.ts`, `shared/food-demo-order.ts`, `tests/food-worker-firestore.integration.test.ts` (Emulator); falta checkout real, rate limit KV e E2E Auth | PARTIAL | 0,5 |
| 9 | Reservas/QR/locks tenant-aware | `app/api/t/[slug]/reservations/route.ts`, `shared/food-demo-reservation.ts`, `app/t/[slug]/tables`, `app/t/[slug]/reservations`, REST Emulator + Rules; reserva comercial e E2E browser pendentes | PARTIAL | 0,5 |
| 10 | Caixa/finanças e módulos admin tenant-aware | `app/t/[slug]/finance/page.tsx`, resumo de pedidos simulados, Rules por CASHIER/MANAGER; caixa/recebimento/fechamento reais faltam | PARTIAL | 0,5 |
| 11 | White-label além de nome/tagline/cor | `app/t/[slug]/branding/page.tsx`, validação de cores/fonte, tema de prévia e Rules owner-only; faltam domínios, imagens/licenças e telas completas | PARTIAL | 0,5 |
| 12 | E2E A/B navegador/Worker/KV + visuais verificados | CI cobre Auth+Firestore Emulator e endpoints HTTP reais com token; ainda faltam browser E2E, Worker/KV remoto e screenshots de tela real | PARTIAL | 0,5 |

**Medição fixa:** 8 / 12 = **66,7% de cobertura ponderada** destes itens, NÃO grau de prontidão para produção. Não declarar 95% sem evidência.

## NOW F1–F6

- F1 PARTIAL: migração reversível de cardápio/mesas no Emulator com manifesto; faltam migração real autorizada, backups e paridade integral.
- F2 PARTIAL: lead, demos, roles, catálogo e contexto Worker read-only; mutations ainda não usam TenantContext.
- F3 PARTIAL SaaS: nova rota de pedidos demo em Emulator com transação/preço servidor; reserva demo com bloqueios atômicos de 90 min foi implementada; resumo financeiro simulado por tenant; caixa, reservas reais e pedidos reais continuam legados.
- F4 MISSING e mantido fora do CORE_FIRST: Global Standard depois de isolamento backend.
- F5 PARTIAL: telas demo privadas, demais módulos ainda não tenantizados.
- F6 PARTIAL: CI verifica regras/compilação; falta E2E funcional e QA móvel.

## Próximo código prioritário

Autenticação HTTP validada nos Emulators; implementar E2E autenticado no navegador, captura real das telas e testes de Worker/KV sob concorrência. Em seguida, preservar algoritmos legados e portar pedidos, reservas, locks/idempotência e KV para tenant A/B com testes negativos e de concorrência. Não ligar checkout demo ou deploy até a fronteira passar testes de integração.

## Provas e segurança

Somente GitHub branch + CI com dados sintéticos. Nenhum cliente legado foi migrado; Baru continua prospect `NOT_SIGNED`, não convertido. Nenhum screenshot real novo foi capturado. Logs, dados reais e tokens não devem ser enviados ao GitHub.
