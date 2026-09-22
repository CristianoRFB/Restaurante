# Arquitetura do Baru

O produto é uma aplicação React/TypeScript compilada por Vinext/Vite para Cloudflare Workers. A UI é composta por componentes reais; as referências visuais ficam apenas como documentação.

## Camadas

- shared/baru-domain.ts: entidades, validações, horários de funcionamento e projeção pública da reserva.
- lib/baru-data.ts: seeds isolados do modo demo; não são usados como fallback de dados operacionais quando NEXT_PUBLIC_DATA_MODE=firebase.
- lib/baru-repository.ts: adapters local/Firebase para catálogo, clientes, mesas, conteúdo, configurações, equipe e autenticação administrativa; a criação pública de reservas chama a fronteira server-side.
- app/api/reservations/route.ts: endpoint confiável que valida schema Zod, tamanho/timeout, aplica idempotência e aloca mesa com locks transacionais no Firestore.
- shared/order-domain.ts: catálogo comercial, adicionais, cálculo de preço, carrinho e máquina de estados dos pedidos.
- app/api/orders/route.ts: endpoint confiável de checkout interno; jamais aceita preço, total ou status vindos do navegador.
- lib/customer-account.ts: autenticação Firebase por e-mail/senha e perfil privado em customerAccounts/{uid}.
- components/admin-shell.tsx: sessão, navegação e autorização de rota. Equipe é exclusiva de ADMIN.
- firestore.rules: autorização por papel e validação estrutural no backend.
- Cloudflare Worker: entrega os assets e as rotas Vinext no Worker baru-gastronomia.

## Dados

Em modo Firebase, coleções vazias aparecem como estado vazio ou “não cadastrado”; o painel não mistura seeds fictícios com dados reais. O cardápio público leva a produto, carrinho e checkout internos. O iFood é apenas um link externo secundário configurado no restaurante.

A reserva pública envia somente data, horário, grupo e dados mínimos ao endpoint. O Worker grava a solicitação operacional, a projeção pública mínima, a chave idempotente e os locks em uma operação transacional. A projeção pública não contém o WhatsApp completo. Sem áreas/mesas reais publicadas, a API bloqueia a solicitação em vez de criar uma reserva sem capacidade conhecida.

O módulo `/admin/mesas` grava áreas e mesas reais com validação no repository e nas Rules. `/admin/conteudo` grava `siteContent/main`, `/admin/configuracoes` grava `restaurantSettings/main` e `/admin/configuracoes/pedidos` grava `orderSettings/main`; todos validam o documento no repository e nas Rules. `/admin/cardapio`/`/admin/catalogo` grava categorias e itens reais; `/admin/adicionais` grava grupos/opções e `/admin/promocoes` grava descontos que o Worker aplica no checkout.

Pedidos internos gravam o documento privado em `orders/{id}`, a projeção mínima consultável pelo código em `publicOrders/{publicCode}` e o registro de idempotência em `orderRequests/{clientRequestId}`. O pedido autenticado recebe `customerAccountUid` e pode ser consultado somente pela própria conta; a equipe usa os estados operacionais em `/admin/pedidos`.

## Autorização

- Visitantes não acessam o painel.
- ADMIN acessa equipe e funções de gestão.
- MANAGER acessa módulos operacionais de gestão, exceto equipe.
- CASHIER e SERVICE não acessam equipe, cardápio, mesas, relatórios, conteúdo ou configurações.
- As Rules são a autoridade do backend; a UI apenas antecipa o bloqueio.

Não existe rota administrativa de inbox/WhatsApp. O produto mantém somente links externos wa.me construídos com o telefone do cliente/reserva ou configuração verificada do restaurante.
