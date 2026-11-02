import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const url = 'https://food-gu-doces-demo.on7.workers.dev';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(url+'/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#cat-name:not(:empty)');
  assert.equal((await page.locator('#cat-name').textContent())?.trim(),'Tradicional');
  await page.locator('[data-flavor="Beijinho"]').click();
  await page.locator('[data-flavor="Ninho"]').click();
  assert.equal(await page.locator('.selected-pill').count(),2);
  assert.match(await page.locator('#order-total').textContent(), /145,00/);
  await page.locator('#demo-name').fill('Cliente Teste E2E');
  await page.locator('#add-order').click();
  await page.waitForURL('**/producao');
  const card = page.locator('.order-card').filter({hasText:'Cliente Teste E2E'});
  await card.waitFor();
  assert.match(await card.textContent(),/Aguardando sinal/);
  await card.locator('[data-advance]').click();
  assert.match(await card.textContent(),/Confirmado/);
  await page.locator('a[data-route="/gestao"]').first().click();
  await page.waitForURL('**/gestao');
  assert.equal(await page.locator('#management-orders .order-card').filter({hasText:'Cliente Teste E2E'}).count(),1);
  await page.locator('[data-price="tradicional"]').fill('160');
  await page.locator('[data-price="tradicional"]').dispatchEvent('change');
  await page.locator('a[data-route="/"]').first().click();
  await page.waitForURL(url+'/');
  assert.match(await page.locator('#cat-price').textContent(),/160,00/);
  const sizes = await page.evaluate(() => ({width:document.documentElement.scrollWidth,screen:window.innerWidth}));
  assert.ok(sizes.width <= sizes.screen+2, 'mobile horizontal overflow: '+JSON.stringify(sizes));
  assert.deepEqual(errors,[]);
  console.log('E2E passed: mobile 390px, category, order, production, admin editor, navigation and no page exceptions.');
} finally { await browser.close() }
