# Auditoria final rígida — Baru Gastronomia

Data da rodada: 22/09/2026
Repositório auditado: `CristianoRFB/Restaurante`
Worker auditado: `https://baru-gastronomia.acai-mais-sabor.workers.dev`

## Resultado executivo

O sistema deixou de usar o módulo administrativo fictício de Atendimento/WhatsApp. A rota `/admin/atendimento` não existe no build publicado e responde 404. Inbox, conversas, seeds e permissões desse módulo foram removidos; a referência visual correspondente foi arquivada.

O ambiente está conectado ao Firebase real `restaurante-5665d`. O login administrativo usa Firebase Authentication, o perfil `admin@gmail.com` tem papel `ADMIN`, a área do cliente está publicada em `/conta` e o catálogo oficial foi cadastrado no Firestore com 23 categorias, 339 itens ativos, 3 momentos de serviço e 3 destaques.

O pedido de comida é real, mas segue para o canal oficial do iFood. O site não finge processar pagamento ou entrega internamente. A reserva pública passa por `POST /api/reservations`, com validação server-side, idempotência, locks e Rules sem escrita anônima direta na coleção operacional. Como ainda não há mesas/áreas reais cadastradas, o endpoint responde 409 explicando a pendência; ele não cria uma reserva fictícia.

Não é nota 10 nem prontidão irrestrita de produção. Faltam App Check, cadastro operacional das mesas, domínio próprio, testes de concorrência e ampliação da observabilidade. Essas lacunas estão explícitas e bloqueiam a declaração de “produção pronta”.

## Percentual de maturidade

Percentual estimado nesta rodada: **82% do sistema real entregue**.

O percentual considera código publicado, dados reais, segurança, testes e operação comprovados; não considera como concluídas funções que dependem de configuração externa ainda ausente. A principal diferença restante é operacional, não uma tela demonstrativa: mesas/áreas precisam existir antes de aceitar reservas, além de App Check, domínio próprio e observabilidade para tráfego público irrestrito.

## Pontuação por área

| Área | Nota | Evidência e limite restante |
|---|---:|---|
| Funcionalidade pública | 8/10 | Home, cardápio, conta, reserva, iFood e páginas de confirmação estão publicados; compra própria não é processada no site. |
| Firebase real | 8/10 | Auth, Firestore, catálogo, conteúdo e configurações reais publicados; mesas, áreas e operação de reservas ainda precisam de cadastro. |
| Segurança e Rules | 8/10 | Rules sem escrita anônima direta em `reservations`, endpoint com whitelist de campos, rate limit persistente e CSP/headers ativos; App Check falta. |
| Reservas e integridade | 8/10 | Validação, idempotência, locks, duração configurável, projeção pública mínima e ID inexistente sem fallback; falta teste de carga concorrente e mesas reais. |
| E2E e qualidade | 8/10 | Lint, typecheck, build, 8 testes unitários, 6 testes Rules, smoke público 5/5 e suíte autenticada 3/3; falta ampliar cenários de escrita e concorrência. |
| UX desktop/mobile | 8/10 | Rotas públicas e módulos administrativos navegáveis; menu móvel e estados de carregamento/erro foram verificados; falta matriz visual maior. |
| Documentação | 8/10 | README, arquitetura, Firebase, segurança, deploy, testes e esta auditoria refletem o estado atual; ainda há decisões operacionais para registrar quando as mesas forem cadastradas. |
| Produção irrestrita | 7/10 | App Check, domínio próprio, monitoramento e mesas reais ainda bloqueiam esta classificação. |

## Correções confirmadas

- `/admin/atendimento`, `InboxView`, `Conversation`, `ConversationStatus`, seeds de `conversations`, Rules e índice legado foram removidos.
- A referência `15-admin-atendimento-whatsapp.png` foi arquivada; há 19 referências visuais ativas.
- O cliente Firebase usa o emulador Firestore na porta 8180 quando configurado e não mistura seeds com Firebase de produção.
- Configurações reais do restaurante foram publicadas no documento `restaurantSettings/main`.
- Cardápio oficial foi cadastrado no Firestore: 23 categorias, 339 itens ativos, 3 momentos e 3 destaques.
- Consultas públicas usam `where(active == true)`, compatíveis com as Rules públicas.
- Reserva com ID inexistente exibe “Reserva não encontrada” sem cair na primeira seed.
- Idempotência distingue `Reservation` completa de `PublicReservation` reduzida.
- Consulta pública expõe somente `whatsappLast4`.
- Escrita anônima direta em `reservations` e `reservationRequests` foi bloqueada.
- O endpoint server-side rejeita campos privilegiados antes de tocar o Firebase e retorna 409 quando não há mesas disponíveis.
- O rate limit público usa o binding persistente `RESERVATION_RATE_LIMIT` em Cloudflare KV, com chave derivada por hash do IP.
- Slots derivam de `openingHours`, timezone, antecedência mínima e duração configuradas.
- Botões sem persistência foram removidos, desabilitados ou marcados explicitamente como demo.
- A CSP permite as imagens reais do catálogo armazenadas no Firebase Storage, além dos recursos já necessários.
- O formulário de login aguarda a hidratação antes de aceitar entrada, evitando perda de credenciais em navegador rápido.

## Evidências desta rodada

- `npm run audit` — aprovado: 19 referências ativas, Atendimento removido e endpoint presente.
- `npm run lint` — aprovado.
- `npm run typecheck` — aprovado.
- `npm test -- --run` — 8 testes unitários aprovados.
- `npm run test:rules` — 6 testes de Rules aprovados, emulador em `127.0.0.1:8180`.
- `npm run build` — aprovado; rotas incluindo `/api/reservations` foram enumeradas.
- `npm run deploy:firebase` — Rules e índices publicados no projeto `restaurante-5665d`; App Check permanece como aviso de configuração pendente.
- `npm run test:e2e` — 5 testes públicos/adversariais aprovados; 3 testes autenticados são ignorados sem credenciais.
- `npm run test:e2e:auth` com `admin@gmail.com` / `admin123` — 3 testes autenticados aprovados.
- Smoke remoto — `/`, `/cardapio`, `/conta`, `/reservar`, `/admin/login` retornaram 200; `/admin/atendimento` retornou 404.
- Smoke remoto do endpoint — payload com `status` privilegiado retornou 400; payload válido sem mesas retornou 409.
- Smoke visual no navegador — `/cardapio` mostrou categorias, busca, filtros, preços, descrições, imagens reais e links oficiais do iFood.
- Worker publicado nesta rodada: `62ff20c3-b27c-458d-867d-34e74a32dfec`.
- Remoto Git confirmado: `https://github.com/CristianoRFB/Restaurante.git`.

## Pendências que impedem 100%

1. Ativar Firebase App Check no domínio final.
2. Cadastrar áreas e mesas reais no Firebase e testar reservas com capacidade operacional real.
3. Adicionar E2E de criação, confirmação, cancelamento e concorrência de reservas.
4. Configurar domínio próprio e observabilidade/alertas de produção.
5. Trocar a senha inicial `admin@gmail.com` / `admin123` antes do uso operacional.
6. Decidir, em requisito separado, se o negócio quer checkout próprio; hoje o pedido online é deliberadamente encaminhado ao iFood oficial.

## Conclusão

O que está publicado agora é uma base real, conectada ao Firebase e ao Cloudflare, com catálogo operacional e limites honestos. Não há Atendimento cenográfico ativo e não há promessa falsa de reserva ou checkout quando a infraestrutura correspondente ainda não foi cadastrada. A classificação correta é **82% concluído**, com **produção controlada**, não produção irrestrita.
