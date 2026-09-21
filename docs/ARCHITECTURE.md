# Arquitetura do Baru

O produto é uma aplicação React/TypeScript compilada por Vinext/Vite para Cloudflare Workers. A UI pública e o painel usam componentes reais, sem screenshots como plano de fundo.

## Camadas

- Domínio: `shared/baru-domain.ts` contém entidades, enums, validação de reserva e regras de apresentação.
- Dados: `lib/baru-data.ts` contém seeds fictícios e conteúdo inicial do Baru.
- Repositories: `lib/baru-repository.ts` encapsula persistência local do modo demo e adapters Firebase para autenticação, reservas, confirmação pública e leitura operacional.
- Apresentação: componentes públicos e administrativos seguem tokens de cor e espaçamento em `app/globals.css`.
- Autorização: o painel usa sessão local somente no demo; no modo Firebase a sessão é revalidada pelo Auth e pelo documento `users/{uid}`, com guarda de função no shell e Rules no backend.

## Estado

Reservas demo podem ser criadas e editadas no navegador. Com `NEXT_PUBLIC_DATA_MODE=firebase`, reservas públicas e administrativas usam Firestore, confirmação pública usa cópia opaca e reenvios usam `reservationRequests/{idempotencyKey}` transacional. Os demais módulos administrativos ainda usam seeds demo e serão ligados gradualmente.
