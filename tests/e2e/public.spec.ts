import { expect, test } from '@playwright/test';

test('rotas públicas essenciais permanecem navegáveis', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Baru Gastronomia/);
  await expect(page.getByRole('link', { name: 'Cardápio', exact: true })).toBeVisible();

  const cardapioResponse = await page.goto('/cardapio');
  expect(cardapioResponse?.headers()['content-security-policy']).toContain('https://storage.googleapis.com');
  await expect(page.getByRole('heading', { name: 'Cardápio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Monte seu pedido/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /carrinho/i }).first()).toBeVisible();
  await expect(page.getByText(/Pedir no iFood/i)).toHaveCount(0);

  await page.goto('/conta');
  await expect(page.getByRole('heading', { name: 'Minha conta', exact: true })).toBeVisible();

  await page.goto('/reservar');
  await expect(page.getByRole('button', { name: /Solicitar reserva/i })).toBeVisible();

  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Acesso da equipe', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Acessar modo demo/i })).toHaveCount(0);
});

test('admin sem sessão bloqueia a operação e oferece o login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Acesso da equipe', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir para o login', exact: true })).toBeVisible();
});

test('menu móvel abre e fecha sem navegação cenográfica', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Abrir menu' });
  await expect(toggle).toBeVisible();
  await page.waitForTimeout(750);
  await toggle.click();
  const mobileNavigation = page.getByRole('navigation', { name: 'Navegação móvel' });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Reservar mesa', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Fechar menu' }).click();
  await expect(mobileNavigation).toBeHidden();
});

test('rota removida de Atendimento continua inexistente', async ({ page }) => {
  const response = await page.goto('/admin/atendimento');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
});
