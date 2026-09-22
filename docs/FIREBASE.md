# Firebase

Projeto alvo: restaurante-5665d.

A configuração web do SDK é pública e fica nos arquivos de exemplo. Service accounts, tokens, senhas e arquivos .env reais não entram no Git. O modo de dados é separado do fato de o SDK conseguir inicializar: a tela de setup distingue fallback do bundle, modo Firebase, ambiente de produção validado e App Check.

## Coleções

restaurantSettings, serviceMoments, menuCategories, menuItems, areas, tables, customers, reservations, publicReservations, reservationRequests, customerAccounts, siteContent e users.

Não existe coleção de conversas/inbox no produto atual.

## Emulador

O Firestore Emulator usa a porta 8180 em firebase.json, .env.example e lib/firebase-client.ts. O cliente lê host e porta pelas variáveis NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST e NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT.

## Auth e cliente

O login da equipe usa Firebase Authentication por e-mail/senha e consulta users/{uid}. A área /conta usa o mesmo provedor, mas grava apenas o perfil do próprio usuário em customerAccounts/{uid}.

## Reserva pública

O visitante pode criar somente uma solicitação NEW de origem SITE, com histórico inicial controlado, sem tableId e sem leitura da coleção operacional. A Rules exige coerência entre a reserva, a projeção pública e a chave de idempotência com getAfter. A confirmação pública lê somente os campos mínimos e exibe apenas os quatro últimos dígitos do WhatsApp.

O limite estrutural de Rules não substitui um endpoint confiável para rate limiting, antiabuso e alocação concorrente de mesas. Overbooking de reserva confirmada deve ser fechado antes de abrir essa operação ao público.

## Comandos

    npm run test:rules
    npm run deploy:firebase
