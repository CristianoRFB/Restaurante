import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

const html = readFileSync('public/demos/delicias-viajantes/index.html');
const server = createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const root = 'http://127.0.0.1:' + port + '/';
const browser = await chromium.launch({ headless: true });
mkdirSync('artifacts/delicias-ux', { recursive: true });
const report = [];
let failed = false;
async function check(width, height, route, name) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(root + '#/' + route, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#app')?.children.length > 0);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    headline: document.querySelector('main h1')?.textContent,
    products: document.querySelectorAll('.product').length,
    loadedImages: [...document.querySelectorAll('#app img')].filter(img => img.complete && img.naturalWidth > 0).length
  }));
  const overflow = dimensions.scrollWidth > dimensions.innerWidth + 2;
  if (overflow || errors.length) failed = true;
  await page.screenshot({ path: 'artifacts/delicias-ux/' + name + '.png', fullPage: true });
  report.push({ name, route, width, height, overflow, errors, ...dimensions });
  if (route === 'cliente' && width === 390) {
    await page.locator('[data-action=add]').first().click();
    await page.locator('[data-action=cart]').first().click();
    await page.locator('[data-action=simulate]').click();
    const order = await page.locator('.order-row').count();
    if (order !== 1) failed = true;
    report.push({ name: 'journey', simulatedOrder: order, heading: await page.locator('main h1').textContent() });
    await page.screenshot({ path: 'artifacts/delicias-ux/flow-attendance-390.png', fullPage: true });
  }
  await page.close();
}
try {
  for (const w of [320, 360, 390, 430, 768, 1024, 1440]) {
    await check(w, w <= 430 ? 844 : 900, 'cliente', 'cliente-' + w);
  }
  // Simulate an offline image CDN. Fallback art must prevent empty catalog cards.
  const blocked = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await blocked.route('**/images.unsplash.com/**', route => route.abort());
  await blocked.goto(root + '#/cliente', { waitUntil: 'load' });
  await blocked.waitForFunction(() => document.querySelectorAll('.media-fallback').length === 6);
  await blocked.waitForTimeout(300);
  const fallback = await blocked.evaluate(() => ({
    count: document.querySelectorAll('.media-fallback .mock-pouch').length,
    visibleCopy: [...document.querySelectorAll('.mock-pouch b')].map(e => e.textContent)
  }));
  if (fallback.count !== 6) failed = true;
  report.push({ name: 'photos-blocked-390', ...fallback });
  await blocked.screenshot({ path: 'artifacts/delicias-ux/photos-blocked-390.png', fullPage: true });
  await blocked.close();
  for (const route of ['atendimento', 'gestao']) {
    for (const w of [390, 1440]) {
      await check(w, w < 500 ? 844 : 900, route, route + '-' + w);
    }
  }
} finally {
  await browser.close();
  server.close();
  writeFileSync('artifacts/delicias-ux/qa-report.json', JSON.stringify(report, null, 2));
  for (const row of report) console.log(JSON.stringify(row));
}
if (failed) process.exitCode = 1;
