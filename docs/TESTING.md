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

Os testes de domínio cobrem calendário, horários derivados da configuração (inclusive funcionamento atravessando meia-noite), lead time, lotação, WhatsApp, observação, códigos, cálculo de carrinho, adicionais e transições de pedido. O teste de Rules prova que não existe escrita anônima operacional, que pedidos privados não são lidos por outra conta, que a projeção pública não expõe telefone/endereço, que IDs de documentos não podem divergir e que os papéis continuam isolados. A suíte adversarial HTTP rejeita campos privilegiados, tipos incorretos, JSON malformado, payload grande e não anuncia sucesso sem capacidade/configuração real.

## Verificações manuais

Percorra:

/ → /cardapio → /conta → /reservar → /reserva/[codigo] → login Firebase → dashboard → reservas → edição → clientes → cardápio → mesas → equipe.

Repita em viewport móvel, teclado, zoom de 200%, refresh e duplo clique. Teste ID de reserva inexistente e confirme que nenhuma reserva seed é aberta. Percorra produto → carrinho → checkout e confirme que o total exibido é recalculado no servidor. Teste também /admin/atendimento: a rota deve responder como inexistente, pois o módulo foi removido.

O smoke E2E Playwright cobre as rotas públicas essenciais, o CTA interno do cardápio sem o antigo CTA externo, visitante bloqueado no painel, a abertura/fechamento do menu móvel, a inexistência da rota administrativa removida e os casos adversariais do endpoint. Com `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`, `npm run test:e2e:auth` autentica no Firebase, navega os módulos administrativos, incluindo Pedidos, verifica os botões persistentes de Conteúdo/Configurações, testa ID inexistente e viewport móvel.
