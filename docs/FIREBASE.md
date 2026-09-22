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

O visitante envia somente os dados mínimos para `POST /api/reservations`. O Worker valida o schema, horário, lead time, capacidade do grupo, idempotência e disponibilidade; a gravação em `reservations`, `publicReservations`, `reservationRequests` e `reservationLocks` usa credencial de serviço e uma transação Firestore. O navegador não possui mais permissão anônima para gravar nessas coleções.

O endpoint expõe apenas a projeção mínima na confirmação e guarda somente os quatro últimos dígitos do WhatsApp no documento público. A operação responde explicitamente que as reservas aguardam o cadastro das mesas quando não existe capacidade operacional confirmada; não há seed de mesas em produção.

## Comandos

    npm run test:rules
    npm run deploy:firebase
