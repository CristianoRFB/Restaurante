# Arquitetura do Baru

O produto é uma aplicação React/TypeScript compilada por Vinext/Vite para Cloudflare Workers. A UI é composta por componentes reais; as referências visuais ficam apenas como documentação.

## Camadas

- shared/baru-domain.ts: entidades, validações, horários de funcionamento e projeção pública da reserva.
- lib/baru-data.ts: seeds isolados do modo demo; não são usados como fallback de dados operacionais quando NEXT_PUBLIC_DATA_MODE=firebase.
- lib/baru-repository.ts: adapters local/Firebase para reservas, catálogo, clientes, mesas, conteúdo, configurações, equipe e autenticação administrativa.
- lib/customer-account.ts: autenticação Firebase por e-mail/senha e perfil privado em customerAccounts/{uid}.
- components/admin-shell.tsx: sessão, navegação e autorização de rota. Equipe é exclusiva de ADMIN.
- firestore.rules: autorização por papel e validação estrutural no backend.
- Cloudflare Worker: entrega os assets e as rotas Vinext no Worker baru-gastronomia.

## Dados

Em modo Firebase, coleções vazias aparecem como estado vazio ou “não cadastrado”; o painel não mistura seeds fictícios com dados reais. O cardápio público direciona pedido ao iFood oficial enquanto não existe checkout próprio implementado.

A reserva pública grava a solicitação operacional, a projeção pública mínima e a chave idempotente em uma operação transacional. A projeção pública não contém o WhatsApp completo. O cliente escolhe apenas data, horário e quantidade; mesa e status privilegiados permanecem fora do fluxo público.

## Autorização

- Visitantes não acessam o painel.
- ADMIN acessa equipe e funções de gestão.
- MANAGER acessa módulos operacionais de gestão, exceto equipe.
- CASHIER e SERVICE não acessam equipe, cardápio, mesas, relatórios, conteúdo ou configurações.
- As Rules são a autoridade do backend; a UI apenas antecipa o bloqueio.

Não existe rota administrativa de inbox/WhatsApp. O produto mantém somente links externos wa.me construídos com o telefone do cliente/reserva ou configuração verificada do restaurante.
