// Only localhost Firestore Emulator and demo- projects. Never accesses actual Baru project.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import {
  assertFoodMigrationEnvironment, planFoodLegacyMigration,
  applyFoodLegacyMigration, rollbackFoodLegacyMigration,
} from '../shared/food-legacy-migration.ts';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const m = /^--([a-z-]+)=(.+)$/.exec(arg);
  if (!m) throw new Error('Parâmetro inválido: ' + arg);
  return [m[1], m[2]];
}));
const tenantId = args.tenant ?? '';
const mode = args.mode ?? 'plan';
if (!['plan','apply','rollback'].includes(mode)) throw new Error('Use --mode=plan|apply|rollback.');
if (mode !== 'plan' && args.confirm !== tenantId) {
  throw new Error('Apply/rollback exigem --confirm=<tenantId> idêntico ao destino.');
}
const hostSetting = process.env.FIRESTORE_EMULATOR_HOST ?? '';
const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
assertFoodMigrationEnvironment({ host: hostSetting, projectId, tenantId });
const [host,port] = hostSetting.split(':');
const env = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port) } });
try {
  await env.withSecurityRulesDisabled(async ctx => {
    // Emulator testing context exposes a compatibility Firestore surface backed by the same SDK.
    const db = ctx.firestore() as unknown as Firestore;
    if (mode === 'plan') {
      const entries = await planFoodLegacyMigration(db, tenantId);
      process.stdout.write(JSON.stringify({ dryRun: true, tenantId, migration: 'food-legacy-emulator-v1',
        summary: { total: entries.length, creates: entries.filter(x => x.status === 'CREATE').length,
          conflicts: entries.filter(x => ['CONFLICT','DRIFT'].includes(x.status)).length },
        // No raw customer data, WhatsApp, brand descriptions or product texts in output.
        entries: entries.map(x => ({ path: x.path, status: x.status, checksum: x.checksum })),
      }, null, 2) + '\n');
    } else if (mode === 'apply') {
      process.stdout.write(JSON.stringify({ mode, tenantId, ...(await applyFoodLegacyMigration(db, tenantId)) }) + '\n');
    } else {
      process.stdout.write(JSON.stringify({ mode, tenantId, removed: await rollbackFoodLegacyMigration(db, tenantId) }) + '\n');
    }
  });
} finally { await env.cleanup(); }
