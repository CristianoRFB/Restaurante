# Segurança

- As Firestore Rules usam `users/{uid}.role` com `ADMIN`, `MANAGER`, `CASHIER` e `SERVICE`.
- Clientes públicos podem criar somente solicitações de reserva com status `NEW` e limites de domínio; leituras e alterações exigem equipe autenticada.
- Exclusões administrativas são limitadas a `ADMIN`/`MANAGER` onde aplicável.
- O modo demo é local e não representa autenticação de produção; o modo Firebase usa Authentication por e-mail/senha e a função de `users/{uid}`.
- Conteúdo exibido na interface vem de dados tipados; não há HTML arbitrário sendo renderizado.
- WhatsApp é preparado por link `wa.me`; não há alegação de integração oficial.
- Não há service account, token ou senha no repositório.

Riscos restantes: habilitar o provedor/usuários do Firebase Auth no ambiente final, aplicar rate limiting/antiabuso para reservas públicas, ativar App Check no domínio final, revisar headers/CSP do Worker e fazer teste de dependências em pipeline CI.
