# F3 — transação e pedidos DEMO tenant-aware (incremento)

**Escopo:** rota `POST /api/t/[slug]/orders` e Firestore REST transaction apenas no **Emulator local**. Não altera `POST /api/orders` do Baru, caixa, pagamento, iFood, reservas ou dados existentes.

## Contrato

- O endpoint recusa produção por padrão: só habilita com `FOOD_DEMO_ORDERS_MODE=emulator`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180` e `FIREBASE_PROJECT_ID=demo-...`.
- Cliente fornece apenas `clientRequestId` (16–80 caracteres alfanuméricos/_/-), `items:[{productId,quantity}]`, e Firebase ID token. Nunca preço, tenantId, pagamento, endereço ou telefone.
- Tenant vem do slug validado no servidor. Login/Auth, status e membership são reavaliados dentro da mesma transação Firestore dos produtos e pedido. Cada item é relido no próprio tenant, e o servidor calcula centavos/totais.
- Criação utiliza `currentDocument.exists=false` em `tenants/{tenantId}/orders/{clientRequestId}`: mesmo ID+payload retorna o mesmo pedido; ID com payload diferente retorna 409. Conflitos concorrentes retornam 409 para retry com o mesmo ID.
- Resultado `DEMO_RECEIVED` é **simulação sem cobrança, preparo ou entrega**; não envia qualquer notificação externa nem atualiza o legado.
- A Rules vigente permite leitura a membros/plataforma e impede escrita direta pelo SDK cliente; apenas o endpoint confiável efetua transação.
- Endpoint somente de teste/emulator ainda precisa da verificação autenticada do Firebase Auth Emulator e teste de integração REST Emulator para ser classificado CODE_COMPLETE. Unit tests isolam política/precificação/idempotência, mas não provam commit REST hospedado.

## Exemplo de payload sintético

```json
{"clientRequestId":"pedido-demo-0123456789","items":[{"productId":"demo-prato","quantity":2}]}
```

## NEXT

1. Testar integração Worker/Firestore Emulator, Auth Emulator, commit e replay.
2. Criar interface de carrinho e acompanhamento interno no tenant, sem reutilizar armazenamento `baru-*`.
3. Portar reservas/mesas/QR e concorrência em paths por tenant, preservando regras do Baru.
4. Somente então planejar liberação em staging autorizado. Produção não deve receber este endpoint habilitado sem nova decisão.
