import { expect, test } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe('painel administrativo autenticado', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, 'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar a suíte autenticada.');
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: /Entrar no painel/i }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Operação do dia', exact: true })).toBeVisible();
  });

  test('navega todos os módulos publicados sem 404/500', async ({ page }) => {
    const routes = ['/admin', '/admin/reservas', '/admin/reservas/nova', '/admin/agenda', '/admin/clientes', '/admin/cardapio', '/admin/mesas', '/admin/equipe', '/admin/relatorios', '/admin/conteudo', '/admin/configuracoes', '/admin/setup'];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator('h1').first(), route).toBeVisible();
      await expect(page.locator('body'), route).not.toContainText('Application error');
    }
  });

  test('ID de reserva inexistente não abre registro seed', async ({ page }) => {
    const response = await page.goto('/admin/reservas/does-not-exist/editar');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Reserva não encontrada', exact: true })).toBeVisible();
    await expect(page.getByText(/não foi possível abrir esta reserva/i)).toBeVisible();
  });

  test('menu administrativo não ressuscita Atendimento e funciona no celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: 'Atendimento', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Navegação rápida' })).toBeVisible();
  });
});
