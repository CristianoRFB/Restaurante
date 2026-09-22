# Segurança

- Firestore Rules usam users/{uid}.role com ADMIN, MANAGER, CASHIER e SERVICE.
- Visitantes não leem nem gravam `reservations`, `publicReservations`, `reservationRequests` ou `reservationLocks`; o fluxo público passa pelo endpoint server-side do Worker.
- publicReservations expõe código, data, horário, nome, pessoas, status, datas de controle e os quatro últimos dígitos do WhatsApp; o telefone completo fica fora da projeção pública.
- A tela /admin/equipe é exclusiva de ADMIN, alinhada com as Rules.
- O modo Firebase não renderiza seeds de catálogo, clientes, mesas ou conteúdo como operação real.
- WhatsApp é somente link externo wa.me; não existe WhatsApp Cloud API nem inbox simulada.
- O endpoint público aplica limite best-effort por IP no Worker, valida payload sem campos privilegiados e usa token curto de service account apenas no ambiente secreto do Cloudflare.
- Inputs têm limites de tamanho e não são renderizados como HTML.
- A configuração do emulador fica centralizada em variáveis com porta 8180.

## Riscos abertos

App Check no domínio final, uma política de rate limiting persistente (KV/Cloudflare Rules), domínio próprio e cadastro operacional de áreas/mesas ainda precisam de configuração externa antes de declarar prontidão de produção irrestrita. A fronteira confiável, a alocação transacional e a cobertura E2E estão implementadas e verificadas; o sistema prefere bloquear a reserva quando a capacidade real não está cadastrada.
