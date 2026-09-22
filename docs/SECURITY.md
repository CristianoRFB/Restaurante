# Segurança

- Firestore Rules usam users/{uid}.role com ADMIN, MANAGER, CASHIER e SERVICE.
- Visitantes não leem nem gravam `reservations`, `publicReservations`, `reservationRequests` ou `reservationLocks`; o fluxo público passa pelo endpoint server-side do Worker.
- Visitantes não gravam `orders`, `publicOrders` ou `orderRequests`; o checkout passa pelo endpoint server-side, que recalcula catálogo, adicionais, taxa e total com credencial secreta.
- `orders` pode ser lida pela equipe ou pela conta autenticada cujo `customerAccountUid` coincide; `publicOrders` permite somente `get` pelo código exato e não contém endereço nem WhatsApp completo.
- publicReservations expõe código, data, horário, nome, pessoas, status, datas de controle e os quatro últimos dígitos do WhatsApp; o telefone completo fica fora da projeção pública.
- A tela /admin/equipe é exclusiva de ADMIN, alinhada com as Rules.
- O modo Firebase não renderiza seeds de catálogo, clientes, mesas ou conteúdo como operação real.
- WhatsApp é somente link externo wa.me; não existe WhatsApp Cloud API nem inbox simulada.
- Os endpoints públicos aplicam limite persistente de 8 tentativas por minuto e por IP hashado em Cloudflare KV, validam payload com Zod sem campos privilegiados, limitam o corpo, usam timeout de 10 segundos e usam token curto de service account apenas no ambiente secreto do Cloudflare.
- Inputs têm limites de tamanho e não são renderizados como HTML.
- A configuração do emulador fica centralizada em variáveis com porta 8180.

## Riscos abertos

App Check no domínio final, domínio próprio, alertas e cadastro operacional de áreas/mesas ainda precisam de configuração externa antes de declarar prontidão de produção irrestrita. A fronteira confiável, o rate limiting persistente, a alocação transacional e a cobertura E2E estão implementados e verificados; o sistema prefere bloquear a reserva quando a capacidade real não está cadastrada.
