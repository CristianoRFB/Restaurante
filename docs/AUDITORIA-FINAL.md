# Auditoria final rígida — Baru Gastronomia

Data da rodada: 22/09/2026
Repositório: `CristianoRFB/Restaurante`
Origin: `https://github.com/CristianoRFB/Restaurante.git`
Worker: `https://baru-gastronomia.acai-mais-sabor.workers.dev`
Projeto Firebase: `restaurante-5665d`
Worker publicado nesta rodada: `2b23476b-6756-4b2b-9276-09be2c91f2eb`

## Resultado executivo

O módulo fictício de Atendimento/WhatsApp continua removido: `/admin/atendimento` responde 404, não há `InboxView`, coleção `conversations` nem referência visual ativa correspondente. WhatsApp aparece somente como contato legítimo.

O pedido online agora é interno ao Baru. O cliente navega do catálogo real para produto, personalização, carrinho persistente, checkout, cupom, retirada/entrega/consumo no local conforme configuração, criação idempotente no Worker/Firebase e acompanhamento público. Conta autenticada tem `/conta/pedidos` e “Pedir novamente”; a equipe opera `/admin/pedidos` com transições e lançamento financeiro ao concluir.

O endpoint `POST /api/orders` recalcula preços a partir do catálogo Firebase, valida adicionais, cupom, pedido mínimo, taxa, zona, mesa, troco, horário de funcionamento e disponibilidade operacional. Ele grava `orders`, `publicOrders`, `orderNotifications` e `orderRequests` em commit atômico e aplica rate limit por IP hashado em KV. O iFood permanece apenas como canal externo opcional, sem participar do pedido interno.

O painel agora contém CRUD real de catálogo/categorias, grupos e adicionais, promoções, configuração de modos/zonas, caixa e visão financeira. Regras impedem escrita pública direta em pedidos e isolam pedidos privados por `customerAccountUid`.

O painel `/admin/mesas` gera QR Code e link público para cada mesa real. O acesso `/mesa/[id]` leva ao cardápio interno, persiste a mesa na sessão do cliente e torna o campo de mesa somente leitura no checkout até uma troca explícita. A API valida novamente a mesa no Firebase antes de aceitar o pedido.

Maturidade estimada: **92%**, com produção controlada. O núcleo do pedido interno e a operação administrativa estão funcionais, mas ainda não é correto declarar produção irrestrita: faltam App Check, domínio/alertas, dados operacionais finais, instruções Pix completas, teste E2E de criação real controlado e teste concorrente de pedidos.

## Pontuação por critério

| Critério | Nota | Evidência e limite |
|---|---:|---|
| Funcionalidade | 9/10 | Pedido interno, reservas, conta, catálogo, operação de pedidos, promoções, caixa, finanças, horário, notificação de novos pedidos e QR de mesa publicados. |
| UX desktop | 8/10 | Rotas públicas/admin navegáveis, estados vazios e erros explícitos. |
| UX mobile | 8/10 | Menu e painel verificados em viewport estreito; falta matriz visual ampla. |
| Acessibilidade | 7/10 | Labels, headings, roles e estados principais; falta auditoria automatizada completa. |
| Segurança | 8/10 | Rules, CSP, payloads estritos, timeout, rate limit e service account secreto; App Check pendente. |
| Firebase | 9/10 | Auth, Firestore, Storage, catálogo, pedidos e módulos operacionais reais publicados. |
| Rules Firestore | 9/10 | 12 testes cobrem anonimato, conta, pedido privado, projeção pública, promoções, notificações, caixa, conteúdo e papéis. |
| Integridade de preço | 9/10 | Preço nunca é confiado ao navegador; catálogo, adicionais, cupom, taxa e total são recalculados no Worker. |
| Concorrência/overbooking | 8/10 | Reservas usam locks transacionais; pedido usa idempotência, mas ainda falta teste de carga concorrente. |
| Privacidade/PII | 8/10 | Projeção pública não expõe endereço nem WhatsApp completo; pedido privado é por conta/equipe. |
| Testes unitários | 8/10 | 13 testes Vitest aprovados, incluindo carrinho, adicionais, transições e disponibilidade por horário. |
| Testes de integração | 9/10 | 12 testes de Rules aprovados no emulator em 8180. |
| E2E | 8/10 | Smoke público e auth cobrem rotas, login, acesso de mesa, 404 removido e módulos; criação de pedido real controlada ainda pendente. |
| Cloudflare | 8/10 | Worker, KV, observabilidade, CSP e deploy verificados; domínio/alertas ainda externos. |
| Documentação | 9/10 | README, arquitetura, segurança, deploy, testes e auditoria descrevem o fluxo interno. |
| Limpeza de legado | 9/10 | Atendimento, seeds de conversas, Rules e referência visual antiga removidos. |
| Prontidão para produção | 8/10 | Núcleo real publicado; App Check, troca da senha inicial, dados finais, alertas e QA operacional ainda faltam. |

## Evidências executadas

- `npm run lint` — aprovado.
- `npm run typecheck` — aprovado.
- `npm test` — 13 testes aprovados.
- `npm run test:domain` — 13 testes aprovados.
- `npm run test:rules` — 12 testes aprovados no Firestore Emulator `127.0.0.1:8180`.
- `npm run audit` — aprovado: 19 referências visuais ativas e Atendimento removido.
- `npm run build` — aprovado, com rotas de catálogo, checkout, pedidos, adicionais, promoções, caixa, finanças e configuração de pedidos enumeradas.
- `npm run test:e2e` — 8 smoke tests aprovados; 4 cenários autenticados foram pulados sem variáveis.
- `npm run test:e2e:auth` — 4 cenários autenticados aprovados com `admin@gmail.com` / `admin123`.
- `npm run deploy:firebase` — Rules e índices publicados em `restaurante-5665d`.
- `npm run deploy:vinext` — Worker publicado na versão `2b23476b-6756-4b2b-9276-09be2c91f2eb`.
- `npm install qrcode @types/qrcode` — QR Codes são gerados no painel a partir do link público real de cada mesa.
- Smoke HTTP publicado: `/cardapio`, `/produto/[id]`, `/carrinho`, `/checkout`, `/admin/pedidos`, `/admin/configuracoes/pedidos`, `/admin/catalogo`, `/admin/adicionais`, `/admin/caixa`, `/admin/financas` e `/admin/promocoes` respondem 200; `/admin/atendimento` responde 404.
- Firebase Identity Toolkit confirmou que a credencial administrativa de teste é válida. A senha inicial não deve permanecer em produção.

## Pendências que impedem 100%

1. Configurar Firebase App Check no domínio final.
2. Trocar `admin@gmail.com` / `admin123` antes do uso operacional.
3. Cadastrar e conferir áreas, mesas e QR reais; o backend já valida mesa para consumo no local.
4. Cadastrar zonas, taxas, horários e formas de recebimento reais em `/admin/configuracoes/pedidos`.
5. Completar instruções Pix e eventuais notificações adicionais conforme operação real; a notificação persistente de novo pedido já está implementada.
6. Executar E2E controlado de criação, idempotência, confirmação, conclusão, promoção e pedido autenticado sem deixar lixo operacional.
7. Executar teste de concorrência/abuso e configurar domínio próprio, alertas Cloudflare/Firebase e política de rotação de segredos.
8. Avaliar as vulnerabilidades moderadas somente de desenvolvimento sem downgrade inseguro.

## Definição de encerramento

O goal de pedidos internos foi implementado e publicado, mas permanece aberto até que as pendências operacionais e de produção acima tenham evidência. Não há justificativa para nota 10 enquanto o sistema ainda depender de configuração externa e não possuir E2E de pedido real/concor­rência.
