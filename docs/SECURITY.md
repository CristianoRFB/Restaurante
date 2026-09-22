# Segurança

- Firestore Rules usam users/{uid}.role com ADMIN, MANAGER, CASHIER e SERVICE.
- Visitantes não leem reservations; o fluxo público aceita apenas solicitação NEW/SITE com schema mínimo e coerência transacional entre as três coleções.
- publicReservations expõe código, data, horário, nome, pessoas, status, datas de controle e os quatro últimos dígitos do WhatsApp; o telefone completo fica fora da projeção pública.
- A tela /admin/equipe é exclusiva de ADMIN, alinhada com as Rules.
- O modo Firebase não renderiza seeds de catálogo, clientes, mesas ou conteúdo como operação real.
- WhatsApp é somente link externo wa.me; não existe WhatsApp Cloud API nem inbox simulada.
- Inputs têm limites de tamanho e não são renderizados como HTML.
- A configuração do emulador fica centralizada em variáveis com porta 8180.

## Riscos abertos

Rate limiting/antiabuso, App Check no domínio final, CSP/headers finais, endpoint confiável para confirmação e alocação concorrente de mesas, além de E2E Playwright, ainda precisam de validação antes de declarar prontidão de produção. Esses riscos permanecem explícitos e não são mascarados por uma nota alta.
