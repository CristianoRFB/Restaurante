# Condado — Food SaaS, 4 mesas (apresentação)
**Site:** https://food-condado-preview.on7.workers.dev/
**Cardápio:** https://food-condado-preview.on7.workers.dev/cardapio
**Reservas:** https://food-condado-preview.on7.workers.dev/reservas
**Admin:** https://food-condado-preview.on7.workers.dev/painel
**QR:** /mesa/1, /mesa/2, /mesa/3, /mesa/4

## Fluxo
1. Cliente chega por QR de uma mesa. Escolhe produtos e confirma um pedido demonstrativo.
2. Worker valida os preços do catálogo persistente D1, gera pedido e encontra ou cria conta da mesa.
3. Outro pedido à mesma mesa soma à conta aberta. Status RECEBIDO → EM PREPARO → PRONTO → ENTREGUE.
4. Cliente pede fechamento; admin recebe sinalização, imprime uma pré-conta não fiscal e fecha a conta após confirmar atendimento.
5. Cliente também pode solicitar reserva para até quatro pessoas. Gestor atribui mesa 1–4 na aprovação; regra impede janelas de 90 min conflitantes na mesma mesa.
6. Gestor edita catálogo/preços no painel (somente demo); cardápio público lê banco.

## Contratos e limites
- Prospect NOT_SIGNED; sem endosso oficial, reservas/pedidos reais ou emissão fiscal.
- Banco D1 isolado food-condado-preview, tenant condado-demo, dados de teste.
- Quatro mesas são configuração ilustrativa informada pelo prospectador, não capacidade física verificada; horários e cardápio deverão ser confirmados pelo estabelecimento.
- Fotos de banco de imagens ilustrativo, não fotos oficiais. Produtos e valores simulados.
- ADMIN_TOKEN é segredo Cloudflare, nunca versionado. Frontend guarda sessão apenas via sessionStorage.
- Comprovante gerado via impressão HTML não é NFC-e/DANFE. Integração fiscal requer credenciamento, credenciais e autorização.
- Sem integração no Firebase Food multi-tenant legado; é um módulo isolado de demonstração real no repositório Food. Nunca migrar o Baru nem habilitar checkout financeiro real sem autorização e testes.
- Antes de um uso comercial efetivo implementar: autenticação e papéis próprios, QR de mesa autenticado/rotativo, observabilidade, antiabuso mais forte, acordo LGPD e política de retenção/backup, estabilidade transacional de pedidos, pagamento real quando autorizado e testes end-to-end.

## Operação
Execute node build.mjs, depois npx wrangler deploy com o acesso Cloudflare autorizado. Os arquivos no GitHub são a fonte canônica; a versão de deploy empacota assets. O banco é provisionado separadamente e descrito em schema.sql. No bootstrap do banco existente foram executados ALTER TABLE para adicionar orders.table_number, orders.tab_id e reservations.table_number.
