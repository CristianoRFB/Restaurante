# Deploy

## Firebase

1. Confirme npx firebase use = restaurante-5665d.
2. Rode npm run test:rules.
3. Rode npm run deploy:firebase quando Rules ou índices mudarem.
4. Não publique service account, tokens ou .env.production.local.

## Cloudflare

1. Configure o ambiente Firebase de produção e App Check no domínio final.
2. Publique o segredo `FIREBASE_SERVICE_ACCOUNT_JSON` no Worker; ele é usado apenas pelos endpoints server-side de reservas e pedidos e nunca entra no Git.
3. Rode npm run lint, npm run typecheck, npm test, npm run test:rules, npm run test:e2e, npm run audit e npm run build.
4. Verifique wrangler.jsonc: Worker baru-gastronomia, assets, observabilidade e o binding KV `RESERVATION_RATE_LIMIT` habilitados. O mesmo namespace usa prefixos separados para `reservation:` e `order:`.
5. Publique com `npm run deploy:vinext` (o Vite usa explicitamente `@cloudflare/vite-plugin`).
6. Smoke test em /, /cardapio, /produto/[id], /carrinho, /checkout, /conta/pedidos, /pedido/[codigo], /reservar, /admin/login, /admin sem sessão, `POST /api/reservations`, `POST /api/orders` e a rota administrativa removida.

URL publicada atual: https://baru-gastronomia.acai-mais-sabor.workers.dev/

O namespace/domínio próprio ainda é uma pendência externa desta conta Cloudflare. App Check e alertas também precisam ser configurados antes de produção irrestrita. O checkout interno não armazena dados de cartão; o iFood é somente canal externo opcional. Não existe inbox de WhatsApp.
