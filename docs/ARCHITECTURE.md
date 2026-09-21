# Arquitetura do Baru

O produto é uma aplicação React/TypeScript compilada por Vinext/Vite para Cloudflare Workers. A UI pública e o painel usam componentes reais, sem screenshots como plano de fundo.

## Camadas

- Domínio: `shared/baru-domain.ts` contém entidades, enums, validação de reserva e regras de apresentação.
- Dados: `lib/baru-data.ts` contém seeds fictícios e conteúdo inicial do Baru.
- Repositories: `lib/baru-repository.ts` encapsula persistência local do modo demo e a futura troca por Firebase.
- Apresentação: componentes públicos e administrativos seguem tokens de cor e espaçamento em `app/globals.css`.
- Autorização: o painel exige uma sessão local de demonstração; em produção a decisão deve vir do Firebase Auth + Rules, nunca de esconder botões.

## Estado

Reservas demo podem ser criadas e editadas no navegador. A persistência é deliberadamente local até a conexão do repository Firebase. Isso evita misturar dados fictícios com produção.
