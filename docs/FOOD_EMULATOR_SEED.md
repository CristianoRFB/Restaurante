# Seed Food DEMO — somente Emulator

Atenção: o lead Baru não possui contrato fechado; a identidade pública da demo continua genérica. O segundo lead é apenas uma *fixture* dentro do Emulator, nunca um registro comercial verdadeiro.

1. Inicie Firestore + Auth Emulators com um projeto `demo-`.
2. Crie uma conta de teste no Auth Emulator e obtenha o UID dela.
3. Execute:
   ```bash
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 FIREBASE_PROJECT_ID=demo-baru-gastronomia FOOD_PLATFORM_OWNER_UID=UID_DE_TESTE npm run seed:food:demo
   ```
4. Entre em `/platform/leads` com a conta do Auth Emulator e use a prévia privada, quando implementada.

O seed não carrega dados operacionais, senhas, clientes, pedidos ou imagens do Firebase real. Não sobrescreve documentos existentes. Falha em host remoto, projeto de produção e UID vazio. O app Food legacy continua single-tenant nas rotas originais; não use a nova demo como checkout/produção.
