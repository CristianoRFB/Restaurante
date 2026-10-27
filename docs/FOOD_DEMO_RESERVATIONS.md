# F3 Food — reservas DEMO por tenant, blocos e QR privados

## Implementado e validado
- Rota `POST /api/t/[slug]/reservations`: exige Firebase Auth (Auth Emulator em modo demo), member/tenant ativo, JSON estrito e `FOOD_DEMO_ORDERS_MODE=emulator`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180`, projeto `demo-...`.
- `clientRequestId` é estável por tentativa; um replay idêntico retorna o mesmo registro, um replay divergente é conflito.
- O Worker não aceita `tenantId` no corpo e não aceita telefone, nome de cliente, pagamento nem preço. Mesa e capacidade são consultadas no mesmo tenant; a reserva dura 90 minutos.
- Transação Firestore REST grava `tenants/<tenant>/reservations/<requestId>` **e** três locks `tenants/<tenant>/reservationLocks/<tableId>_<YYYYMMDD_HHMM>` com `exists:false` atômico. Sobreposição de 30 minutos é bloqueada, sem afetar outro tenant.
- `tenants/<tenant>/tables` é mantida com Rules e UI privada em `/t/[slug]/tables`. QRs privados apontam para `/t/[slug]/reservations?tableId=...`. QRs não geram acesso anônimo nem representam agendamento oficial.
- `tests/food-demo-reservation.test.ts` valida datas, lotação, A×B, suspensões, duplicidade, colisão; `tests/food-worker-firestore.integration.test.ts` verifica transação, atomicidade e concorrência no Emulator. `npm run test:rules`, `npm run build`, lint, typecheck, unit passaram em GitHub Actions **40563938285**.

## Não implementado (não afirmar produção)
- Migrar os fluxos legados Baru de reservas, horário/abertura, durações por estabelecimento, cancelamento e no-show, notificações, locks externos/KV e operação pública.
- E2E real de browser + Auth Emulator, QR em dispositivo físico e testes de operação com vários usuários reais.
- Reserva demo não envolve cliente pagante nem consentimento de uso público da marca Baru.
- Nada foi importado ou publicado no Firebase/Cloudflare real. `main` permanece intocada.

## Teste local de demonstração (Emulator)
1. Iniciar Firestore e Auth Emulators em projeto `demo-` e executar seed idempotente `npm run seed:food:demo` com UID de teste autenticado.
2. Habilitar Firebase demo no app e em ambiente local do Worker; nunca reutilizar credenciais do cliente real.
3. Entrar com conta permitida em `/t/<tenant-slug>/login`.
4. Criar/visualizar mesas em `/t/<tenant-slug>/tables`, obter QR **privado**, e reservar em `/t/<tenant-slug>/reservations`.
5. Repetir a tentativa com mesmo requestId e outra tentativa com horário sobreposto: uma só reserva deve persistir. Repetir com Tenant B e confirmar isolamento.

Esta documentação não substitui testes de navegador/sistema implantado. Screenshots reais e diagramas ficam para a fase final de documentação visual aprovada.
