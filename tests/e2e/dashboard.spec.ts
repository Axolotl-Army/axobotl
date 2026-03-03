import { test, expect } from '@playwright/test';

test.describe('Dashboard — unauthenticated', () => {
  test('root redirects to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('Axobotl');
    await expect(page.locator('a[href="/auth/discord"]')).toBeVisible();
  });

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('body')).toContainText('Sign in with Discord');
  });

  test('login page shows discord sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    const btn = page.locator('a[href="/auth/discord"]');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Sign in with Discord');
  });

  test('health endpoint returns ok', async ({ page }) => {
    const response = await page.request.get('/health');
    expect(response.status()).toBe(200);
    const body = await response.json() as { status: string };
    expect(body.status).toBe('ok');
  });
});
