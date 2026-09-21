# Auditoria final — Baru Gastronomia

Data: 21/09/2026
Escopo: conversão da base herdada para produto Baru, seguindo as 20 referências visuais.

## Resultado

O fluxo Baru foi implementado e publicado. As rotas públicas são `/`, `/cardapio`, `/reservar` e `/reserva/[codigo]`. O painel cobre login demo, operação do dia, reservas, nova/edição, agenda, clientes, cardápio, mesas, atendimento/WhatsApp, equipe, relatórios, conteúdo, configurações e setup.

## Notas honestas

| Área | Nota | Evidência e causa de nota abaixo de 9 |
| --- | ---: | --- |
| Funcionalidade | 8 | Fluxos públicos e admin demo funcionam; reserva pública e login já possuem adapter Firebase, enquanto os módulos administrativos restantes continuam demo/local. |
| UX desktop | 8 | Design system editorial aplicado nas 20 rotas; QA visual automatizado ficou bloqueado pela ausência de backend IAB nesta sessão. |
| UX mobile | 8 | Layouts responsivos e bottom navigation implementados; falta validação visual real em dispositivo. |
| Fidelidade às referências | 8 | Estrutura, paleta, tipografia e conteúdo equivalente foram implementados; as fotos são URLs de demonstração e não os assets finais do restaurante. |
| Personalização Baru | 9 | “Momentos do Baru” está configurável e integrado em home/cardápio/conteúdo demo. |
| Responsividade | 8 | Breakpoints, tabelas com overflow, formulário móvel e navegação inferior implementados; teste de viewport automatizado ainda falta. |
| Acessibilidade | 8 | Labels, foco visível, status textuais, alt text, reduced motion e touch targets foram tratados; falta auditoria com leitor de tela. |
| Segurança | 7 | Rules foram publicadas/testadas; Auth real, App Check, rate limiting e CSP/headers ainda dependem do ambiente final. |
| Firebase | 8 | Projeto `restaurante-5665d`, Rules e índices estão publicados; SDK modular, Auth por e-mail/senha e repository de reservas estão disponíveis por modo de ambiente. |
| Integridade de dados | 8 | Validações e limites de reserva estão cobertos; concorrência real de duas sessões ainda precisa de transação no repository Firebase. |
| Performance | 7 | Build verde e assets públicos antigos deixaram de ser empacotados; imagens externas, chunks acima de 500 kB e ausência de profiling/Lighthouse mantêm risco. |
| Dependências | 7 | `npm audit` identificou 7 vulnerabilidades moderadas no conjunto herdado; não há correção automática aplicada sem validar impacto no stack. |
| Qualidade de código | 8 | Domínio, dados, UI e módulos foram separados; alguns componentes de tela ainda são grandes e pedem extração incremental. |
| Cobertura/qualidade de testes | 7 | 6 testes de domínio + 4 de Rules passam; ainda faltam testes de componentes, e2e e fuzzing de concorrência. |
| Tratamento de erros | 7 | Formulários e estados vazios/erro estão tratados; timeout/offline de Firebase real ainda não está conectado. |
| Offline/degradação | 8 | Modo demo local degrada sem backend; o comportamento offline da integração Firebase ainda não foi validado. |
| Cloudflare/deploy | 8 | Worker novo `baru-gastronomia` foi publicado e smoke-tested; a URL padrão ainda usa um namespace externo legado da conta. |
| Documentação | 9 | README, arquitetura, Firebase, segurança, testes, deploy e auditoria foram atualizados. |
| Limpeza de legado | 9 | Rotas, Functions, scripts, catálogo e referências de marca antigas foram removidos do código versionável; assets antigos estão ignorados pela build. |
| Prontidão para demonstração | 9 | Fluxo público, login demo e módulos administrativos estão navegáveis e publicados. |
| Prontidão para produção | 7 | Auth e reserva Firebase estão conectados por modo; ainda faltam repositories dos módulos administrativos, App Check, antiabuso, observabilidade e QA visual/a11y completo. |

As correções possíveis dentro do escopo foram feitas antes da nova rodada de gates: remoção de legado, novo domínio, Rules, config Firebase, Worker novo, isolamento de assets públicos, validações e documentação. As notas abaixo de 9 refletem trabalho externo/integracional ainda não disponível ou validações que não foram falsamente declaradas.

## Comandos executados

- `git remote -v` — fetch/push apontam para `https://github.com/CristianoRFB/Restaurante.git`.
- `npm run lint` — passou.
- `npm run typecheck` — passou.
- `npm test` — 2 arquivos, 6 testes passaram.
- `npm run test:rules` — 1 arquivo, 4 testes passaram no emulador.
- `npm run build` — passou; 20 rotas Baru foram geradas.
- `npm run ci` — passou novamente com lint, typecheck, testes e build.
- Smoke local e remoto — `/`, `/cardapio`, `/reservar`, `/admin/login` e `/admin` responderam HTTP 200.
- `npx firebase deploy --only firestore:indexes --force --project restaurante-5665d` — índices Baru publicados e índices legados removidos.
- `npx firebase deploy --only firestore:rules --project restaurante-5665d` — Rules atualizadas com confirmação pública opaca.
- `npx wrangler deploy --config wrangler.jsonc` — Worker republicado após o adapter Firebase.

## Estado externo

- Firebase: `restaurante-5665d` ativo; Firestore criado/configurado; Rules e índices publicados; adapter modular versionado para Auth e reservas.
- Cloudflare: Worker `baru-gastronomia` publicado na URL padrão fornecida pela conta; domínio próprio ainda pendente.
- Git: remote oficial correto; o estado auditado está pronto para o primeiro commit da conversão.

## Riscos e bloqueios restantes

1. Criar os usuários Auth e documentos `users/{uid}` de produção; o adapter já está ligado ao SDK quando `NEXT_PUBLIC_DATA_MODE=firebase`.
2. Cadastrar domínio final e ativar App Check; não há chave App Check fornecida.
3. Adicionar rate limiting/antiabuso e transações de disponibilidade para reservas concorrentes.
4. Ligar os repositories Firebase dos módulos administrativos restantes.
5. Configurar domínio público próprio no Cloudflare para remover a dependência do namespace externo da conta.
6. Repetir QA visual/a11y com navegador/dispositivo real; o backend IAB não estava disponível nesta sessão.
