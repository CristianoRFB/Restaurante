import { expect, test } from '@playwright/test';

test('acesso público da mesa mantém a identificação no cardápio', async ({ page }) => {
  const tableId = 'table-sala-principal-12345678';
  const response = await page.goto(`/mesa/${tableId}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Mesa sala principal', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Abrir cardápio/i }).click();
  await expect(page).toHaveURL(new RegExp(`/cardapio\\?mesa=${tableId}`));
  await expect(page.getByRole('heading', { name: 'Mesa identificada', exact: true })).toBeVisible();
});
