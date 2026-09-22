# Deploy

## Firebase

1. Confirme npx firebase use = restaurante-5665d.
2. Rode npm run test:rules.
3. Rode npm run deploy:firebase quando Rules ou índices mudarem.
4. Não publique service account, tokens ou .env.production.local.

## Cloudflare

1. Configure o ambiente Firebase de produção e App Check no domínio final.
2. Publique o segredo `FIREBASE_SERVICE_ACCOUNT_JSON` no Worker; ele é usado apenas pelo endpoint server-side de reservas e nunca entra no Git.
3. Rode npm run lint, npm run typecheck, npm test, npm run test:rules, npm run test:e2e, npm run audit e npm run build.
4. Verifique wrangler.jsonc: Worker baru-gastronomia, assets e observabilidade habilitados.
5. Publique com `npm run deploy:vinext` (o Vite usa explicitamente `@cloudflare/vite-plugin`).
6. Smoke test em /, /cardapio, /conta, /reservar, /admin/login, /admin sem sessão, `POST /api/reservations` e /admin/atendimento inexistente.

URL publicada atual: https://baru-gastronomia.acai-mais-sabor.workers.dev/

O namespace/domínio próprio ainda é uma pendência externa desta conta Cloudflare. Não há integração própria de checkout nem inbox de WhatsApp.
