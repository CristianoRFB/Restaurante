# Auditoria final rígida — Baru Gastronomia

Data da rodada: 22/09/2026  
Repositório: `CristianoRFB/Restaurante`  
Origin: `https://github.com/CristianoRFB/Restaurante.git`  
Worker: `https://baru-gastronomia.acai-mais-sabor.workers.dev`  
Projeto Firebase: `restaurante-5665d`  
Último Worker publicado nesta rodada: `e425fa4d-7243-4ce3-aff4-538d9ca14b0b`

## Resultado executivo

A central fictícia de Atendimento/WhatsApp foi removida. A rota removida responde 404, não há `InboxView`, coleção `conversations` nem referência visual ativa correspondente. O produto mantém apenas links externos `wa.me` para contatos legítimos.

O ambiente publicado usa Firebase real para autenticação, catálogo, conteúdo, configurações e dados operacionais. O catálogo oficial contém 23 categorias, 339 itens ativos, 3 momentos de serviço e 3 destaques. A área do cliente em `/conta` usa Firebase Authentication; o pagamento e a entrega continuam no iFood oficial, pois não existe checkout próprio implementado.

Reservas públicas passam por `POST /api/reservations`, com schema Zod estrito, limite de payload, rate limit por IP hashado em Cloudflare KV, validação de horário/lead time, idempotência e locks transacionais. O painel `/admin/mesas` já grava áreas e mesas reais no Firebase e as Rules validam capacidade, estado e identidade do documento. Como a estrutura operacional ainda está vazia no projeto publicado, a API responde 409 e não fabrica disponibilidade.

Conclusão: o sistema é real e controlado, mas não está pronto para produção irrestrita. A maturidade estimada é **79%**. O percentual não considera como concluído o que depende de configuração externa, dados operacionais ainda ausentes, checkout próprio ou testes de carga não executados.

## Pontuação por critério

| Critério | Nota | Evidência e limite |
|---|---:|---|
| 1. Funcionalidade | 8/10 | Público, conta, catálogo, reservas e painel funcionam; checkout próprio e operação de mesas ainda não estão completos. |
| 2. UX desktop | 8/10 | Rotas públicas e administrativas navegáveis, com estados vazios e erros explícitos. |
| 3. UX mobile | 8/10 | Menu público e painel autenticado verificados em viewport estreito; falta uma matriz visual mais ampla. |
| 4. Fidelidade visual | 8/10 | 19 referências ativas versionadas e telas implementadas; não há nova comparação pixel a pixel nesta rodada. |
| 5. Responsividade | 8/10 | Layouts usam estados e grids responsivos; zoom 200% ainda requer QA manual completo. |
| 6. Acessibilidade | 7/10 | Labels, headings, roles e estados principais existem; falta auditoria automatizada completa e teclado em todas as rotas. |
| 7. Segurança | 8/10 | CSP, headers, payload estrito, timeout, KV rate limit e service account secreto; App Check ainda pendente. |
| 8. Firebase | 8/10 | Auth, Firestore, Storage e dados oficiais reais publicados; App Check e mesas reais ainda dependem de configuração/dados. |
| 9. Rules Firestore | 9/10 | 8 testes cobrem anonimato, PII, papéis, payloads e identidade de documentos; regras não substituem a fronteira confiável do Worker. |
| 10. Autorização | 8/10 | Shell, acesso direto e Rules alinham ADMIN/MANAGER/CASHIER/SERVICE; falta teste com sessão expirada em browser real. |
| 11. Integridade de dados | 8/10 | Schema Zod, validação de reserva/mesa, IDs coerentes e projeção pública mínima; falta CRUD completo de todos os módulos. |
| 12. Concorrência/overbooking | 8/10 | Locks transacionais e retry no Worker; não foi executado teste de carga concorrente em produção. |
| 13. Privacidade/PII | 8/10 | Confirmação pública guarda só os 4 últimos dígitos; logs não registram PII intencionalmente. |
| 14. Performance | 7/10 | Worker e assets publicados; build alerta chunk de repository acima de 500 kB e não há Lighthouse nesta rodada. |
| 15. Qualidade de código | 8/10 | TypeScript, lint, separação de domínio/repository e fronteira server-side; há avisos de convenção middleware/dependências. |
| 16. Testes unitários | 8/10 | 8 testes Vitest aprovados para domínio e dados. |
| 17. Testes de integração | 8/10 | 8 testes de Rules aprovados no emulador em 8180; falta cobertura de CRUD real de conteúdo/configuração. |
| 18. E2E | 8/10 | 10 testes Playwright aprovados, incluindo login, módulos, visitante bloqueado, schema adversarial e rota removida. |
| 19. Tratamento de erros | 8/10 | Loading, not found, permission/error states, 400/409/413/429 e bloqueio sem mesas implementados. |
| 20. Offline/degradação | 6/10 | Falhas são comunicadas e o sistema não inventa sucesso; não há fila offline ou sincronização offline. |
| 21. Cloudflare | 8/10 | Worker `baru-gastronomia`, KV, observabilidade, CSP e smoke remoto publicados; alertas operacionais ainda não configurados. |
| 22. Documentação | 8/10 | README, arquitetura, Firebase, segurança, deploy, testes, índice visual e esta auditoria atualizados. |
| 23. Limpeza de legado | 9/10 | Inbox, seeds de conversas, Rules e referência 15 ativa removidos; menções restantes são testes/documentação da remoção. |
| 24. Prontidão para demonstração | 9/10 | Demo local é identificável, produção não mostra botão demo e o catálogo real é navegável. |
| 25. Prontidão para produção | 6/10 | App Check, domínio próprio, alertas, mesas/áreas publicadas, troca da senha inicial e checkout opcional ainda faltam. |

## Evidências executadas

- `git remote -v`, `git status` e branch confirmaram origin oficial e `main`.
- `npm run audit` — aprovado: 19 referências visuais ativas e endpoint presente.
- `npm run lint` — aprovado.
- `npm run typecheck` — aprovado.
- `npm test -- --run` — 8 testes aprovados.
- `npm run test:rules` — 8 testes aprovados no Firestore Emulator `127.0.0.1:8180`.
- `npm run build` — aprovado; rotas e API enumeradas.
- `npm run test:e2e` com credenciais administrativas — 10 testes aprovados.
- `npm audit --omit=dev` — 0 vulnerabilidades.
- `npm audit` — 7 vulnerabilidades moderadas somente em dependências de desenvolvimento; o reparo sugerido exige downgrade breaking de `firebase-tools`, não aplicado.
- `npm run deploy:firebase` — Rules/índices publicados em `restaurante-5665d`.
- `npm run deploy:vinext` — Worker publicado em `baru-gastronomia`.
- Smoke público: `/`, `/cardapio`, `/conta`, `/reservar` e `/admin/login` carregam; visitante em `/admin` recebe bloqueio de acesso; `/admin/atendimento` responde 404.
- Smoke visual: imagens reais do catálogo, incluindo `POLENTA BROSTOLADA`, carregam sob a CSP atual.

## Busca de resíduos e classificação

- A rota e a inbox antigas não existem no código de produção. Menções remanescentes em testes, auditoria e documentação são regressões intencionais/históricas que provam o 404 e não anunciam uma feature entregue.
- O telefone fictício e o endereço placeholder identificados no TXT não aparecem no código atual.
- Açaí/Acaiteria e outros nomes de origem não fazem parte do domínio operacional do produto; o hostname atual do Worker continua sendo o endereço técnico publicado nesta conta Cloudflare.
- `lib/baru-data.ts` contém fixtures exclusivamente para o modo demo. Em `NEXT_PUBLIC_DATA_MODE=firebase`, repositories retornam estado vazio quando não há documentos reais e não misturam seeds.

## Pendências que impedem 100%

1. Configurar Firebase App Check no domínio final e publicar a chave/site key.
2. Cadastrar as áreas e mesas reais pelo painel `/admin/mesas`; enquanto isso reservas continuam bloqueadas com 409 honesto.
3. Executar E2E de criação, confirmação, cancelamento e concorrência usando dados controlados.
4. Configurar domínio próprio e alertas operacionais do Cloudflare/Firebase.
5. Trocar a senha inicial `admin@gmail.com` / `admin123` antes do uso operacional.
6. Decidir separadamente se haverá checkout próprio; atualmente pedidos seguem ao iFood oficial.
7. Resolver ou aceitar formalmente as vulnerabilidades moderadas somente de desenvolvimento sem downgrade inseguro.

## Definição de encerramento

O TXT foi executado e verificado para remoção do módulo fictício, endurecimento de dados, Rules, autorização, disponibilidade, documentação, quality gates, publicação e smoke remoto. O goal permanece aberto porque as pendências externas e operacionais acima ainda são requisitos explícitos para afirmar produção irrestrita ou 100% concluído.
