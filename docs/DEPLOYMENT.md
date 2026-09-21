# Deploy

## Cloudflare

1. Preencha as variáveis públicas Firebase no ambiente de produção.
2. Execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.
3. Verifique `wrangler.jsonc`: o Worker deve ser `baru-gastronomia`.
4. Execute `npx wrangler deploy --config wrangler.jsonc` com uma sessão autenticada.
5. Faça smoke test de `/`, `/cardapio`, `/reservar` e `/admin/login`. `/admin` deve pedir login direto por URL.

## Firebase

Execute `npm run test:rules` e `npm run deploy:firebase` para Rules e índices. O deploy web e o backend de dados são independentes.

Se o ambiente não tiver autenticação Cloudflare/Firebase, o bloqueio é externo: autenticar o CLI e repetir os comandos acima.
