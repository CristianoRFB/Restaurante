import fs from 'node:fs';
import path from 'node:path';

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(file) : [file];
  });
}

const sourceFiles = ['app', 'components', 'lib', 'shared', 'firestore.rules'].flatMap((entry) => fs.statSync(entry).isDirectory() ? filesUnder(entry) : [entry]);
const source = sourceFiles.filter((file) => /\.(tsx?|rules)$/.test(file)).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const failures = [];
if (fs.existsSync(path.join('app', 'admin', 'atendimento', 'page.tsx'))) {
  failures.push('a rota app/admin/atendimento ainda existe');
}
for (const forbidden of ['InboxView', 'conversations', '5545999876543', 'Av. das Cataratas, 1234', 'admin/atendimento']) {
  if (source.includes(forbidden)) failures.push(`resíduo funcional proibido: ${forbidden}`);
}
const activeReferences = filesUnder('docs/referencias-visuais').filter((file) => file.endsWith('.png') && !file.includes(`${path.sep}arquivo${path.sep}`));
if (activeReferences.length !== 19) failures.push(`referências visuais ativas: esperado 19, encontrado ${activeReferences.length}`);
if (!fs.existsSync('app/api/reservations/route.ts')) failures.push('endpoint confiável de reservas não encontrado');
if (failures.length) {
  console.error('Auditoria estrutural reprovada.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Auditoria estrutural aprovada: ${activeReferences.length} referências ativas, Atendimento removido e endpoint de reserva presente.`);
