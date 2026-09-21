# Firebase

Projeto alvo: `restaurante-5665d`.

As variáveis públicas do SDK Web ficam nos arquivos de exemplo. Elas não concedem acesso administrativo. Service accounts, tokens, chaves de CI e `.env` reais ficam fora do Git.

O Firestore foi modelado para `restaurantSettings`, `serviceMoments`, `menuCategories`, `menuItems`, `areas`, `tables`, `customers`, `reservations`, `conversations`, `siteContent` e `users`. O seed da interface continua local até que os repositories Firebase sejam ativados.

Para validar Rules localmente:

```bash
npm run test:rules
```

Para publicar Rules e índices:

```bash
npm run deploy:firebase
```

O App Check deve ser ativado depois que o domínio de produção estiver cadastrado e a chave do provedor estiver disponível; não se deve colocar uma chave fictícia no ambiente.
