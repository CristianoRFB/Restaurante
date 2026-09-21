# Auditoria final — Baru Gastronomia

Data: 21/09/2026
Escopo: conversão da base herdada para produto Baru, seguindo as 20 referências visuais.

## Resultado

O fluxo Baru foi implementado e publicado. As rotas públicas são `/`, `/cardapio`, `/reservar` e `/reserva/[codigo]`. O painel cobre login demo, operação do dia, reservas, nova/edição, agenda, clientes, cardápio, mesas, atendimento/WhatsApp, equipe, relatórios, conteúdo, configurações e setup.

## Notas honestas

| Área | Nota | Evidência e causa de nota abaixo de 9 |
| --- | ---: | --- |
| Funcionalidade | 8 | Fluxos públicos e admin demo funcionam; repositories ainda persistem localmente até a ligação Firebase real. |
| UX desktop | 8 | Design system editorial aplicado nas 20 rotas; QA visual automatizado ficou bloqueado pela ausência de backend IAB nesta sessão. |
| UX mobile | 8 | Layouts responsivos e bottom navigation implementados; falta validação visual real em dispositivo. |
| Fidelidade às referências | 8 | Estrutura, paleta, tipografia e conteúdo equivalente foram implementados; as fotos são URLs de demonstração e não os assets finais do restaurante. |
| Personalização Baru | 9 | “Momentos do Baru” está configurável e integrado em home/cardápio/conteúdo demo. |
| Responsividade | 8 | Breakpoints, tabelas com overflow, formulário móvel e navegação inferior implementados; teste de viewport automatizado ainda falta. |
| Acessibilidade | 8 | Labels, foco visível, status textuais, alt text, reduced motion e touch targets foram tratados; falta auditoria com leitor de tela. |
| Segurança | 7 | Rules foram publicadas/testadas; Auth real, App Check, rate limiting e CSP/headers ainda dependem do ambiente final. |
| Firebase | 7 | Projeto `restaurante-5665d`, Rules e índices estão publicados; repositories do app continuam demo/local. |
| Integridade de dados | 8 | Validações e limites de reserva estão cobertos; concorrência real de duas sessões ainda precisa de transação no repository Firebase. |
| Performance | 7 | Build verde e assets públicos antigos deixaram de ser empacotados; imagens externas e ausência de profiling/Lighthouse mantêm risco. |
| Dependências | 7 | `npm audit` identificou 7 vulnerabilidades moderadas no conjunto herdado; não há correção automática aplicada sem validar impacto no stack. |
| Qualidade de código | 8 | Domínio, dados, UI e módulos foram separados; alguns componentes de tela ainda são grandes e pedem extração incremental. |
| Cobertura/qualidade de testes | 7 | 6 testes de domínio + 3 de Rules passam; ainda faltam testes de componentes, e2e e fuzzing de concorrência. |
| Tratamento de erros | 7 | Formulários e estados vazios/erro estão tratados; timeout/offline de Firebase real ainda não está conectado. |
| Offline/degradação | 8 | Modo demo local degrada sem backend; o comportamento offline da integração Firebase ainda não foi validado. |
| Cloudflare/deploy | 8 | Worker novo `baru-gastronomia` foi publicado e smoke-tested; a URL padrão ainda usa um namespace externo legado da conta. |
| Documentação | 9 | README, arquitetura, Firebase, segurança, testes, deploy e auditoria foram atualizados. |
| Limpeza de legado | 9 | Rotas, Functions, scripts, catálogo e referências de marca antigas foram removidos do código versionável; assets antigos estão ignorados pela build. |
| Prontidão para demonstração | 9 | Fluxo público, login demo e módulos administrativos estão navegáveis e publicados. |
| Prontidão para produção | 6 | Ainda faltam Auth/repositories Firebase reais, App Check, antiabuso, observabilidade e QA visual/a11y completo. |

As correções possíveis dentro do escopo foram feitas antes da nova rodada de gates: remoção de legado, novo domínio, Rules, config Firebase, Worker novo, isolamento de assets públicos, validações e documentação. As notas abaixo de 9 refletem trabalho externo/integracional ainda não disponível ou validações que não foram falsamente declaradas.

## Comandos executados

- `git remote -v` — fetch/push apontam para `https://github.com/CristianoRFB/Restaurante.git`.
- `npm run lint` — passou.
- `npm run typecheck` — passou.
- `npm test` — 2 arquivos, 6 testes passaram.
- `npm run test:rules` — 1 arquivo, 3 testes passaram no emulador.
- `npm run build` — passou; 20 rotas Baru foram geradas.
- `npm run ci` — passou com lint, typecheck, testes e build.
- Smoke local e remoto — `/`, `/cardapio`, `/reservar`, `/admin/login` e `/admin` responderam HTTP 200.
- `npx firebase deploy --only firestore:rules,firestore:indexes --project restaurante-5665d` — Rules e índices publicados.
- `npx wrangler deploy --config wrangler.jsonc` — Worker publicado.

## Estado externo

- Firebase: `restaurante-5665d` ativo; Firestore criado/configurado; Rules e índices publicados.
- Cloudflare: Worker `baru-gastronomia` publicado na URL padrão fornecida pela conta; domínio próprio ainda pendente.
- Git: remote oficial correto; o estado auditado está pronto para o primeiro commit da conversão.

## Riscos e bloqueios restantes

1. Ligar `lib/baru-repository.ts` ao Firebase Auth/Firestore real, mantendo os contratos demo.
2. Cadastrar domínio final e ativar App Check; não há chave App Check fornecida.
3. Adicionar rate limiting/antiabuso e transações de disponibilidade para reservas concorrentes.
4. Configurar domínio público próprio no Cloudflare para remover a dependência do namespace externo da conta.
5. Repetir QA visual/a11y com navegador/dispositivo real; o backend IAB não estava disponível nesta sessão.
