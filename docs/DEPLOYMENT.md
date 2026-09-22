# Deploy

## Firebase

1. Confirme npx firebase use = restaurante-5665d.
2. Rode npm run test:rules.
3. Rode npm run deploy:firebase quando Rules ou índices mudarem.
4. Não publique service account, tokens ou .env.production.local.

## Cloudflare

1. Configure o ambiente Firebase de produção e App Check no domínio final.
2. Rode npm run lint, npm run typecheck, npm test, npm run test:rules, npm run test:e2e e npm run build.
3. Verifique wrangler.jsonc: Worker baru-gastronomia, assets e observabilidade habilitados.
4. Publique com npx wrangler deploy --config wrangler.jsonc.
5. Smoke test em /, /cardapio, /conta, /reservar, /admin/login, /admin sem sessão e /admin/atendimento inexistente.

URL publicada atual: https://baru-gastronomia.acai-mais-sabor.workers.dev/

O namespace/domínio próprio ainda é uma pendência externa desta conta Cloudflare. Não há integração própria de checkout nem inbox de WhatsApp.
