# Auditoria final rígida — Baru Gastronomia

Data da rodada: 22/09/2026
Escopo: auditoria e correção da base CristianoRFB/Restaurante, com foco em eliminar o módulo Atendimento/WhatsApp fictício, separar Firebase real de seeds, endurecer reservas/Rules e provar o deploy.

## Resultado executivo

A base foi corrigida e republicada. O login administrativo real usa Firebase Authentication, o perfil ADMIN é validado em users/{uid}, a área de cliente existe em /conta, reservas usam o repository Firebase quando NEXT_PUBLIC_DATA_MODE=firebase, e o cardápio público direciona compras para o canal oficial do Baru no iFood. O catálogo próprio permanece vazio até que itens reais sejam cadastrados; nenhum preço de seed é apresentado como operação real.

O módulo fictício Atendimento/WhatsApp foi removido do código, da navegação, das Rules, dos índices e da documentação operacional. A referência visual 15 foi arquivada para não voltar a ser tratada como tela ativa. A rota publicada /admin/atendimento responde 404.

Esta rodada não recebe nota 10. Ainda existem riscos externos e lacunas honestamente declaradas: App Check não está ativado por falta da chave/domínio final, não há E2E Playwright versionado, há dependências moderadas transitivas apenas no firebase-tools de desenvolvimento, o conteúdo próprio ainda precisa de cadastro real e o namespace padrão do Worker ainda não é um domínio próprio do Baru.

## Pontuação

| # | Área | Nota | Evidência e motivo |
|---:|---|---:|---|
| 1 | Funcionalidade | 8 | Home, cardápio, conta, reserva pública, confirmação, login Firebase e operação administrativa estão publicados; compra própria não é processada aqui, apenas no iFood oficial. |
| 2 | UX desktop | 8 | Fluxos principais foram navegados no Worker publicado; a home em Firebase mostra estado vazio explícito quando o conteúdo real não está cadastrado. |
| 3 | UX mobile | 7 | CSS e navegação móvel existem, mas não foi executado E2E em viewport móvel nesta rodada. |
| 4 | Fidelidade visual | 8 | As 19 referências ativas foram preservadas no índice e as telas mantêm a linguagem visual Baru; o conteúdo final e as fotos oficiais ainda dependem de cadastro. |
| 5 | Responsividade | 8 | Breakpoints, tabelas com overflow, formulários e navegação inferior estão implementados; falta prova automatizada em múltiplos viewports. |
| 6 | Acessibilidade | 7 | Labels, estados, textos alternativos e semântica básica existem; falta auditoria dedicada com leitor de tela e axe. |
| 7 | Segurança | 8 | CSP, headers, Auth e Rules estritas foram publicados; App Check, rate limiting e monitoramento de abuso ainda não estão ativos. |
| 8 | Firebase | 8 | Projeto real restaurante-5665d, Auth por e-mail/senha, perfil ADMIN, SDK sem fallback embutido e deploy de Rules/índices confirmados; conteúdo operacional ainda não foi populado. |
| 9 | Regras Firestore | 8 | Schema público mínimo, isolamento de cliente, roles e teste de transação coerente passam; o write público de reserva ainda é uma superfície que merece endpoint confiável dedicado. |
| 10 | Autorização | 8 | /admin/equipe exige ADMIN na UI e as Rules separam ADMIN/MANAGER/CASHIER/SERVICE; não há middleware server-side de rota, então a proteção de dados continua nas Rules. |
| 11 | Integridade de dados | 8 | ID inexistente não cai em seed, idempotência retorna Reservation ou PublicReservation, confirmação pública é projeção mínima e updates são transacionais. |
| 12 | Concorrência/overbooking | 8 | Locks por data, slot de 30 minutos, mesa e duração configurada são lidos/escritos em transação; ainda falta teste de carga concorrente e serviço server-side dedicado. |
| 13 | Privacidade/PII | 9 | A confirmação pública exibe apenas os quatro últimos dígitos do WhatsApp; telefone completo fica restrito ao fluxo autorizado e aos links operacionais. |
| 14 | Performance | 7 | Build passa e upload é funcional; há chunks acima de 500 kB e imagens externas, sem Lighthouse/perfil de Core Web Vitals nesta rodada. |
| 15 | Qualidade de código | 8 | Domínio, repository, autenticação e UI foram separados; alguns módulos JSX ainda são grandes e podem ser extraídos depois. |
| 16 | Testes unitários | 8 | 7 testes unitários passam em 2 arquivos, cobrindo domínio e dados; faltam mais testes de componentes. |
| 17 | Testes de integração | 8 | 6 testes de Firestore Rules passam, incluindo transação pública, PII, roles, isolamento e exclusões; ainda não há suíte completa contra projeto Firebase remoto. |
| 18 | E2E | 3 | Não foi adicionada suíte Playwright versionada; smoke remoto manual via navegador e HTTP foi executado e registrado, mas não substitui E2E. |
| 19 | Tratamento de erros | 7 | Loading, vazio, erro de repository, credencial inválida, conflito de mesa e reserva inexistente têm estados explícitos; faltam política de retry/offline e telemetria. |
| 20 | Offline/degradação | 7 | Modo demo é explicitamente separado e Firebase sem dados não mostra seeds; não há estratégia offline operacional validada. |
| 21 | Cloudflare | 8 | Worker foi republicado e está 100%; headers foram verificados e /admin/atendimento retornou 404; falta domínio próprio e observabilidade mais detalhada. |
| 22 | Documentação | 8 | README, arquitetura, Firebase, segurança, testes, deploy, índice de rotas e esta auditoria foram atualizados; cadastro operacional real ainda precisa ser documentado quando ocorrer. |
| 23 | Limpeza de legado | 9 | Inbox, rota, tipos, coleção, regra e índice de conversations foram removidos; referência 15 está em arquivo e há somente menções históricas de 404 nos testes/deploy. |
| 24 | Prontidão para demonstração | 8 | Login real, dashboard, conta de cliente, cardápio oficial e reserva pública são navegáveis; o conteúdo próprio vazio é intencional e sinalizado. |
| 25 | Prontidão para produção | 6 | Ainda faltam App Check, antiabuso/rate limit, E2E, domínio próprio e cadastro real de conteúdo/cardápio/mesas; portanto não é honesto chamar de pronto para produção irrestrita. |

## Correções realizadas

- Remoção total de /admin/atendimento, InboxView, Conversation, ConversationStatus, seeds de conversations, regra Firestore e índice correspondente.
- Remoção do item Atendimento da sidebar, navegação móvel, dashboard e documentação de módulos entregues.
- Arquivamento de 15-admin-atendimento-whatsapp.png; 19 referências permanecem ativas.
- Correção do emulador Firestore para a porta 8180 em exemplos e cliente.
- Remoção dos fallbacks Firebase embutidos no bundle; configuração passa explicitamente por ambiente.
- Estados de setup distinguem SDK disponível, modo Firebase e ambiente de produção validado.
- Edição com ID inexistente mostra “Reserva não encontrada”, sem abrir a primeira seed.
- Idempotência não trata projeção pública reduzida como Reservation completa.
- Confirmação pública usa whatsappLast4, sem expor WhatsApp completo.
- Rules públicas limitam schema, origem, status, histórico, cliente convidado e vínculos da operação atômica; acesso de cliente e equipe foi isolado.
- Locks de mesa impedem conflito de reservas confirmadas/chegadas e respeitam a duração configurada.
- Slots de reserva derivam de openingHours, timezone, lead time e duração nas configurações.
- Modo Firebase inicia coleções sem seeds; conteúdo, cardápio, clientes, mesas, equipe e reservas vazios aparecem como estado real vazio.
- Botões ainda não persistentes foram removidos ou desabilitados com explicação explícita; o botão de modo demo permanece identificado como demo.
- CSP, X-Content-Type-Options, Referrer-Policy e Permissions-Policy foram adicionados.

## Evidências executadas

- git remote -v — remoto oficial é https://github.com/CristianoRFB/Restaurante.git.
- npm run lint — passou.
- npm run typecheck — passou.
- npm test — 2 arquivos, 7 testes passaram.
- npm run test:rules — 1 arquivo, 6 testes passaram; emulador em 127.0.0.1:8180.
- npm run build — passou; rotas publicadas foram enumeradas pelo Vinext.
- npm audit --omit=dev — 0 vulnerabilidades de produção.
- npm audit — 7 moderadas transitivas em ferramentas de desenvolvimento; npm audit fix atualizou firebase-tools para 15.30.2, e a remoção restante exigiria --force com downgrade incompatível.
- npx firebase deploy --only firestore:rules,firestore:indexes --project restaurante-5665d — Rules compiladas e publicadas; índices publicados.
- npx wrangler deploy --config wrangler.jsonc — Worker republicado.
- Versão Worker verificada: 83399795-0abf-4f1d-a919-3c633e01d296, 100%.
- Smoke HTTP remoto: /, /cardapio, /conta, /reservar, /admin/login, /admin e /admin/equipe responderam 200 com CSP; /admin/atendimento respondeu 404.
- Smoke visual remoto no navegador: login com Firebase redirecionou para /admin e exibiu Administrador Baru; /conta exibiu acesso autenticado; /cardapio exibiu o canal oficial de pedidos; /admin/atendimento exibiu a página 404.
- O modo Firebase exibiu “Conteúdo público aguardando cadastro” e “Cardápio oficial disponível” em vez de renderizar seeds fictícias.

## Estado externo e próximos bloqueios

1. Criar e cadastrar a chave do Firebase App Check para o domínio final.
2. Configurar rate limiting/antiabuso e, idealmente, mover a criação pública para uma fronteira confiável server-side.
3. Cadastrar conteúdo, categorias, itens, áreas e mesas reais no Firebase; não usar os seeds de demonstração como cardápio operacional.
4. Adicionar Playwright E2E desktop/mobile para as rotas críticas e testes de concorrência.
5. Configurar domínio próprio do Baru no Cloudflare.
6. Trocar a senha inicial admin@gmail.com / admin123 antes de uso operacional.

O commit de implementação será registrado no fechamento do Git desta rodada; o SHA publicado pode ser conferido com git rev-parse HEAD após o push.
