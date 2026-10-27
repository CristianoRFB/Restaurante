# Food CORE_FIRST — migração controlada (somente Emulator)

A migração implementada lê exclusivamente as coleções legadas `menuItems` e `tables` do **FireStore Emulator local** e cria projeções no tenant demo. Não faz importação da produção e não converte Baru em cliente.

## Executar localmente

Defina `FIRESTORE_EMULATOR_HOST=127.0.0.1:8180` e `FIREBASE_PROJECT_ID=demo-baru-gastronomia`; o tenant demo precisa existir (veja `docs/FOOD_EMULATOR_SEED.md`).

O DRY_RUN é o padrão:

```bash
npm run migrate:food:legacy -- --mode=plan --tenant=baru-gastronomia-demo
```

Depois de verificar o manifesto, aplicar:

```bash
npm run migrate:food:legacy -- --mode=apply --tenant=baru-gastronomia-demo --confirm=baru-gastronomia-demo
```

Para rollback:

```bash
npm run migrate:food:legacy -- --mode=rollback --tenant=baru-gastronomia-demo --confirm=baru-gastronomia-demo
```

O manifesto exibe apenas paths, checksums de projeções e status `CREATE`, `ALREADY_APPLIED`, `CONFLICT`, `DRIFT`; nunca os documentos de origem na íntegra. Modo apply/rollback requer confirmação exata e só aceita host loopback, projeto `demo-` e tenant `*-demo` com status de demo. Documentos preexistentes nunca são sobrescritos. Tabelas legadas ocupadas ou reservadas migram como INATIVAS/MAINTENANCE.

Cada documento e seu ledger são criados ou excluídos atomicamente na mesma transação. Não há uma transação única para a migração inteira: em falha de rede, pode haver progresso parcial, sendo necessário executar de novo após inspeção. O rollback faz preflight de drift em TODOS os documentos antes de alterar qualquer um e revalida durante cada transação.

A origem global não é removida. Dados de clientes, contatos, pagamentos, reservas, imagens, brand assets, usuários e segredos ficam fora do escopo. O conteúdo de nome/descrição só deve ser usado com dados sintéticos no Emulator.

**Limites ainda pendentes:** plano com backups autorizados e cutover real, migração de histórico e permissões por tenant, operação comercial Baru, testes E2E em browser e rollback transacional em escala.

## Validação

- `tests/food-legacy-migration.test.ts`: schema, projeção, campos excluídos e ambiente.
- `tests/food-legacy-migration.integration.test.ts`: DRY_RUN, apply, reaplicação, rollback, detecção de drift e isolamento A×B no Emulator.
