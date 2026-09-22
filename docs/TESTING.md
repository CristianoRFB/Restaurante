# Testes

## Gates

    npm run lint
    npm run typecheck
    npm test
    npm run test:rules
    npm run test:e2e
    npm run test:e2e:auth
    npm run audit
    npm run build
    npm run ci
    npm audit
    npm audit --omit=dev

Os testes de domínio cobrem calendário, horários derivados da configuração (inclusive funcionamento atravessando meia-noite), lead time, lotação, WhatsApp, observação e códigos. O teste de Rules prova que não existe escrita anônima operacional, que a projeção pública não expõe o telefone completo e que os papéis continuam isolados. A suíte adversarial HTTP rejeita campos privilegiados e não anuncia sucesso sem mesas reais.

## Verificações manuais

Percorra:

/ → /cardapio → /conta → /reservar → /reserva/[codigo] → login Firebase → dashboard → reservas → edição → clientes → cardápio → mesas → equipe.

Repita em viewport móvel, teclado, zoom de 200%, refresh e duplo clique. Teste ID de reserva inexistente e confirme que nenhuma reserva seed é aberta. Teste também /admin/atendimento: a rota deve responder como inexistente, pois o módulo foi removido.

O smoke E2E Playwright cobre as rotas públicas essenciais, a abertura/fechamento do menu móvel, a inexistência de `/admin/atendimento` e os casos adversariais do endpoint. Com `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`, `npm run test:e2e:auth` autentica no Firebase e navega todos os módulos administrativos, testa ID inexistente e viewport móvel.
