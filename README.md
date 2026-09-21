# Baru Gastronomia

Produto web para a operação do Baru Gastronomia: apresentação da casa, cardápio público, solicitação de reservas e painel administrativo para reservas, agenda, clientes, cardápio, mesas, atendimento, equipe, conteúdo e relatórios.

## Direção do produto

O Baru usa uma linguagem de hospitalidade premium: creme quente, oliva profundo, terracota, carvão, fotografia gastronômica e tipografia editorial. A assinatura de produto é **Momentos do Baru**, configurável em `shared/baru-domain.ts` e alimentada pelos dados demo de `lib/baru-data.ts`:

- Café
- À la Carte
- Happy Hour

Os números e pessoas exibidos no modo demo são fictícios.

## Desenvolvimento

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:rules
```

## Rotas

Públicas: `/`, `/cardapio`, `/reservar`, `/reserva/[codigo]`.

Admin: `/admin/login`, `/admin`, `/admin/reservas`, `/admin/reservas/nova`, `/admin/reservas/[id]/editar`, `/admin/agenda`, `/admin/clientes`, `/admin/clientes/[id]`, `/admin/cardapio`, `/admin/mesas`, `/admin/atendimento`, `/admin/equipe`, `/admin/relatorios`, `/admin/conteudo`, `/admin/configuracoes`, `/admin/setup`.

O login oferece modo demonstração com dados locais. Com `NEXT_PUBLIC_DATA_MODE=firebase`, o Auth revalida a sessão e a função do usuário; a autorização do backend está descrita em `docs/SECURITY.md` e nas Firestore Rules.

## Firebase

O projeto configurado é `restaurante-5665d`. A configuração web pública fica em `.env.example` e `.env.production.example`; chaves administrativas e tokens não devem ser versionados. O cliente Firebase real ainda deve ser ligado a repositories quando a operação sair do modo demo.

```bash
copy .env.example .env.local
npm run test:rules
npm run deploy:firebase
```

O comando de deploy do Firebase publica somente Rules e índices. A aplicação web é publicada no Cloudflare Worker `baru-gastronomia`. O modo real já cobre autenticação e o fluxo de reservas; módulos de conteúdo e gestão continuam demo até seus repositories serem ligados.

## Cloudflare

```bash
npm run build
npx wrangler deploy --config wrangler.jsonc
```

O deploy exige autenticação do Wrangler e variáveis públicas do Firebase configuradas no ambiente de produção.

## Arquitetura

- `app/`: rotas Vinext/React.
- `components/`: shell público, shell admin e módulos de operação.
- `lib/baru-data.ts`: seeds demo explícitos.
- `lib/baru-repository.ts`: camada local e adapters Firebase para Auth, reservas, confirmação pública e leituras operacionais.
- `shared/baru-domain.ts`: entidades, validações, status e formatação.
- `firestore.rules`: autorização por papel e validações de dados.

Veja também `docs/ARCHITECTURE.md`, `docs/FIREBASE.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md` e `docs/AUDITORIA-FINAL.md`.
