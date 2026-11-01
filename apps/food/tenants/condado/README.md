# Condado | SaaS Food — prévia online

Site: https://food-condado-preview.on7.workers.dev/
Painel: https://food-condado-preview.on7.workers.dev/painel
Tenant: condado-demo (Cloudflare D1).

## Entregue

Landing editorial responsiva, cardápio de exemplo, comanda digital, solicitação de reserva gravada no banco D1 e painel de atendimento protegido por chave privada do Worker. Itens e preços ilustrativos. O backend recalcula os preços antes de salvar pedidos. As submissões são limitadas por IP com hash.

API: POST /api/orders, POST /api/reservations, GET /api/admin, POST /api/admin/status, GET /health.

Verificação realizada em 2026-11-01: site e painel servidos por Worker real; endpoint /health retornou healthy true; teste transacional retornou HTTP 201 para solicitação e comanda; dados fictícios foram lidos do D1 e removidos após o teste.

## Situação comercial

O negócio citado é real, mas não contratou nem autorizou operar reservas pela plataforma. A landing está identificada como apresentação independente; solicitações não são encaminhadas ao estabelecimento, não há cobrança e o sistema não confirma mesas no café. O cadastro do tenant possui contractStatus NOT_SIGNED e publicationStatus PREVIEW. Não publicar como site oficial.

Para produção: validar marca, cardápio/preços/fotos, capacidade/mesas/horários, tratamento de dados, credenciais da equipe, notificações e reservas com capacidade e colisão transacional.

## Desenvolvimento

Este módulo fica dentro do repositório Food/Baru e é implantado de modo isolado para preservar o Worker do Baru já publicado.

Arquivos: index.html, style.css, app.js, panel.html, panel.js, worker.mjs, build.mjs, schema.sql, tenant.json, wrangler.jsonc.

Gerar Worker: node build.mjs
Verificar sintaxe: node --check dist/worker.mjs
Publicar: npx wrangler deploy --config wrangler.jsonc

O segredo ADMIN_TOKEN deve ser armazenado no Worker; nunca no repositório. A hospedagem usa Cloudflare Workers e D1. Esta implantação ainda não integra Firebase Authentication da branch de core multi-tenant.
