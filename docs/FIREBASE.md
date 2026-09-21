# Firebase

Projeto alvo: `restaurante-5665d`.

As variáveis públicas do SDK Web ficam nos arquivos de exemplo. Elas não concedem acesso administrativo. Service accounts, tokens, chaves de CI e `.env` reais ficam fora do Git.

O Firestore foi modelado para `restaurantSettings`, `serviceMoments`, `menuCategories`, `menuItems`, `areas`, `tables`, `customers`, `reservations`, `conversations`, `siteContent` e `users`. O adapter modular está disponível em `lib/firebase-client.ts` e `lib/baru-repository.ts`; o modo demo continua sendo o padrão e o modo real é ativado com `NEXT_PUBLIC_DATA_MODE=firebase`.

No modo real, o login usa Firebase Authentication por e-mail/senha e consulta `users/{uid}` para obter a função; a reserva pública grava e consulta `reservations` pelo SDK Web. Os demais módulos mantêm seeds demo até seus repositories serem ligados gradualmente.

Para validar Rules localmente:

```bash
npm run test:rules
```

Para publicar Rules e índices:

```bash
npm run deploy:firebase
```

O App Check deve ser ativado depois que o domínio de produção estiver cadastrado e a chave do provedor estiver disponível; não se deve colocar uma chave fictícia no ambiente.
