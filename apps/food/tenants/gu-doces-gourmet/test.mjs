import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Script } from 'node:vm';
import worker from './worker.mjs';

async function page(path = '/') {
  return worker.fetch(new Request('https://gu-demo.test' + path));
}

test('cliente, produção e gestão servem páginas com rótulo de demo', async () => {
  for (const path of ['/', '/producao', '/gestao']) {
    const response = await page(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const html = await response.text();
    assert.ok(html.includes('Demonstração conceitual não oficial'));
    assert.ok(html.includes('Nenhuma encomenda real será enviada'));
    assert.ok(html.includes('Produção'));
    assert.ok(html.includes('Gestão'));
  }
});

test('script da interface é JavaScript sintaticamente válido', async () => {
  const html = await (await page()).text();
  const script = html.split('<script>')[1]?.split('</script>')[0];
  assert.ok(script, 'browser script should be present');
  assert.doesNotThrow(() => new Script(script));
  assert.ok(script.includes('54'));
  assert.ok(script.includes('Ferrero Rocher'));
  assert.ok(script.includes('Entrada de 50%') || html.includes('Entrada de 50%'));
});

test('isola demo de mutações reais e aplica rotas estritas', async () => {
  assert.equal((await page('/api/admin')).status, 404);
  const post = await worker.fetch(new Request('https://gu-demo.test/', { method: 'POST' }));
  assert.equal(post.status, 405);
  const html = await (await page()).text();
  assert.ok(html.includes("connect-src 'none'") === false, 'CSP is a response header, not HTML');
  assert.match((await page()).headers.get('content-security-policy') || '', /connect-src 'none'/);
});
