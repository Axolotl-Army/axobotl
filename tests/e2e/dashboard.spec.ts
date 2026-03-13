import { test, expect } from '@playwright/test';

test.describe('Dashboard -- unauthenticated', () => {
  test('health endpoint returns ok', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  test('root redirects to auth login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('login page shows discord sign-in button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL('/auth/login');
    const btn = page.locator('a[href*="discord"], button:has-text("Discord")');
    await expect(btn.first()).toBeVisible();
  });

  test('login page renders SmartAdmin layout', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('nav.navbar')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Axobotl');
  });

  test('API stats endpoint requires authentication', async ({ page }) => {
    const response = await page.request.get('/api/v1/stats');
    expect(response.status()).toBe(401);
  });

  test('API guilds endpoint requires authentication', async ({ page }) => {
    const response = await page.request.get('/api/v1/guilds');
    expect(response.status()).toBe(401);
  });

  test('API commands endpoint requires authentication', async ({ page }) => {
    const response = await page.request.get('/api/v1/commands');
    expect(response.status()).toBe(401);
  });
});
