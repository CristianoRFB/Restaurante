# Auditoria final rígida — Baru Gastronomia

Data da rodada: 22/09/2026
Repositório: `CristianoRFB/Restaurante`
Origin: `https://github.com/CristianoRFB/Restaurante.git`
Worker: `https://baru-gastronomia.acai-mais-sabor.workers.dev`
Projeto Firebase: `restaurante-5665d`
Worker publicado nesta rodada: `f37a047b-72af-437c-84b1-8133328f95a2`

## Resultado executivo

O módulo fictício de Atendimento/WhatsApp continua removido: `/admin/atendimento` responde 404, não há `InboxView`, coleção `conversations` nem referência visual ativa correspondente. WhatsApp aparece somente como contato legítimo.

O pedido online agora é interno ao Baru. O cliente navega do catálogo real para produto, personalização, carrinho persistente, checkout, cupom, retirada/entrega/consumo no local conforme configuração, criação idempotente no Worker/Firebase e acompanhamento público. Conta autenticada tem `/conta/pedidos` e “Pedir novamente”; a equipe opera `/admin/pedidos` com transições e lançamento financeiro ao concluir.

O endpoint `POST /api/orders` recalcula preços a partir do catálogo Firebase, valida adicionais, cupom, pedido mínimo, taxa, zona, mesa, troco e disponibilidade operacional. Ele grava `orders`, `publicOrders` e `orderRequests` em commit atômico e aplica rate limit por IP hashado em KV. O iFood permanece apenas como canal externo opcional, sem participar do pedido interno.

O painel agora contém CRUD real de catálogo/categorias, grupos e adicionais, promoções, configuração de modos/zonas, caixa e visão financeira. Regras impedem escrita pública direta em pedidos e isolam pedidos privados por `customerAccountUid`.

Maturidade estimada: **88%**, com produção controlada. O núcleo do pedido interno e a operação administrativa estão funcionais, mas ainda não é correto declarar produção irrestrita: faltam App Check, domínio/alertas, dados operacionais finais, QR de mesa, notificações internas completas, teste E2E de criação real controlado e teste concorrente de pedidos.

## Pontuação por critério

| Critério | Nota | Evidência e limite |
|---|---:|---|
| Funcionalidade | 9/10 | Pedido interno, reservas, conta, catálogo, operação de pedidos, promoções, caixa e finanças publicados; notificações completas e QR ainda pendentes. |
| UX desktop | 8/10 | Rotas públicas/admin navegáveis, estados vazios e erros explícitos. |
| UX mobile | 8/10 | Menu e painel verificados em viewport estreito; falta matriz visual ampla. |
| Acessibilidade | 7/10 | Labels, headings, roles e estados principais; falta auditoria automatizada completa. |
| Segurança | 8/10 | Rules, CSP, payloads estritos, timeout, rate limit e service account secreto; App Check pendente. |
| Firebase | 9/10 | Auth, Firestore, Storage, catálogo, pedidos e módulos operacionais reais publicados. |
| Rules Firestore | 9/10 | 11 testes cobrem anonimato, conta, pedido privado, projeção pública, promoções, caixa, conteúdo e papéis. |
| Integridade de preço | 9/10 | Preço nunca é confiado ao navegador; catálogo, adicionais, cupom, taxa e total são recalculados no Worker. |
| Concorrência/overbooking | 8/10 | Reservas usam locks transacionais; pedido usa idempotência, mas ainda falta teste de carga concorrente. |
| Privacidade/PII | 8/10 | Projeção pública não expõe endereço nem WhatsApp completo; pedido privado é por conta/equipe. |
| Testes unitários | 8/10 | 11 testes Vitest aprovados, incluindo carrinho, adicionais e transições. |
| Testes de integração | 9/10 | 11 testes de Rules aprovados no emulator em 8180. |
| E2E | 8/10 | Smoke público e auth cobrem rotas, login, 404 removido e módulos; criação de pedido real controlada ainda pendente. |
| Cloudflare | 8/10 | Worker, KV, observabilidade, CSP e deploy verificados; domínio/alertas ainda externos. |
| Documentação | 9/10 | README, arquitetura, segurança, deploy, testes e auditoria descrevem o fluxo interno. |
| Limpeza de legado | 9/10 | Atendimento, seeds de conversas, Rules e referência visual antiga removidos. |
| Prontidão para produção | 7/10 | Núcleo real publicado; App Check, troca da senha inicial, dados finais, alertas, QR e QA operacional ainda faltam. |

## Evidências executadas

- `npm run lint` — aprovado.
- `npm run typecheck` — aprovado.
- `npm test` — 11 testes aprovados.
- `npm run test:domain` — 11 testes aprovados.
- `npm run test:rules` — 11 testes aprovados no Firestore Emulator `127.0.0.1:8180`.
- `npm run audit` — aprovado: 19 referências visuais ativas e Atendimento removido.
- `npm run build` — aprovado, com rotas de catálogo, checkout, pedidos, adicionais, promoções, caixa, finanças e configuração de pedidos enumeradas.
- `npm run test:e2e` — 7 smoke tests aprovados; 4 cenários autenticados foram pulados sem variáveis.
- `npm run test:e2e:auth` — 4 cenários autenticados aprovados com `admin@gmail.com` / `admin123`.
- `npm run deploy:firebase` — Rules e índices publicados em `restaurante-5665d`.
- `npm run deploy:vinext` — Worker publicado na versão `f37a047b-72af-437c-84b1-8133328f95a2`.
- Smoke HTTP publicado: `/cardapio`, `/produto/[id]`, `/carrinho`, `/checkout`, `/admin/pedidos`, `/admin/configuracoes/pedidos`, `/admin/catalogo`, `/admin/adicionais`, `/admin/caixa`, `/admin/financas` e `/admin/promocoes` respondem 200; `/admin/atendimento` responde 404.
- Firebase Identity Toolkit confirmou que a credencial administrativa de teste é válida. A senha inicial não deve permanecer em produção.

## Pendências que impedem 100%

1. Configurar Firebase App Check no domínio final.
2. Trocar `admin@gmail.com` / `admin123` antes do uso operacional.
3. Cadastrar e conferir áreas, mesas e códigos/QR reais; o backend já valida mesa para consumo no local.
4. Cadastrar zonas, taxas, horários e formas de recebimento reais em `/admin/configuracoes/pedidos`.
5. Completar notificações internas persistentes e entrega de instruções Pix conforme operação real.
6. Executar E2E controlado de criação, idempotência, confirmação, conclusão, promoção e pedido autenticado sem deixar lixo operacional.
7. Executar teste de concorrência/abuso e configurar domínio próprio, alertas Cloudflare/Firebase e política de rotação de segredos.
8. Avaliar as vulnerabilidades moderadas somente de desenvolvimento sem downgrade inseguro.

## Definição de encerramento

O goal de pedidos internos foi implementado e publicado, mas permanece aberto até que as pendências operacionais e de produção acima tenham evidência. Não há justificativa para nota 10 enquanto o sistema ainda depender de configuração externa e não possuir E2E de pedido real/concor­rência.
