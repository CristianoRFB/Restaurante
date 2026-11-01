import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),files=['index.html','menu.html','reservas.html','panel.html','style.css','app.js','panel.js','demo-admin.html','demo-admin.css','demo-admin.js'];
const assets=Object.fromEntries(files.map(name=>[name,fs.readFileSync(path.join(root,name),'utf8')]));
const source=fs.readFileSync(path.join(root,'worker.mjs'),'utf8');
if(!source.includes('__ASSETS__'))throw Error('Worker asset marker missing');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist','worker.mjs'),source.replace('__ASSETS__',JSON.stringify(assets)));
console.log('Built full Food / Condado worker with '+files.length+' assets.');
