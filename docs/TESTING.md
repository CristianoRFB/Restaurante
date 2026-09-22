# Testes

## Gates

    npm run lint
    npm run typecheck
    npm test
    npm run test:rules
    npm run build
    npm run ci
    npm audit
    npm audit --omit=dev

Os testes de domínio cobrem calendário, horários derivados da configuração, lead time, lotação, WhatsApp, observação e códigos. O teste de Rules cobre escrita pública mínima, leitura operacional bloqueada, projeção pública sem telefone completo, idempotência, alteração por equipe e exclusões.

## Verificações manuais

Percorra:

/ → /cardapio → /conta → /reservar → /reserva/[codigo] → login Firebase → dashboard → reservas → edição → clientes → cardápio → mesas → equipe.

Repita em viewport móvel, teclado, zoom de 200%, refresh e duplo clique. Teste ID de reserva inexistente e confirme que nenhuma reserva seed é aberta. Teste também /admin/atendimento: a rota deve responder como inexistente, pois o módulo foi removido.

E2E Playwright e testes adversariais completos ainda são trabalho pendente; a auditoria final deve registrar isso como risco.
