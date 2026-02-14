import { test, expect } from '@playwright/test';

test.describe('USD Monitoring Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring/usd');
  });

  test('displays chart section with canvas', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'USD Balance History' })).toBeVisible();
    await expect(page.locator('#usdChart')).toBeVisible();
  });

  test('displays range buttons with 24h active by default', async ({ page }) => {
    const buttons = page.locator('.range-buttons button');
    await expect(buttons).toHaveCount(3);
    await expect(buttons.nth(0)).toHaveText('24h');
    await expect(buttons.nth(1)).toHaveText('7d');
    await expect(buttons.nth(2)).toHaveText('30d');

    await expect(buttons.nth(0)).toHaveClass(/active/);
  });

  test('switching range updates active button', async ({ page }) => {
    const buttons = page.locator('.range-buttons button');

    await buttons.nth(1).click();
    await expect(buttons.nth(0)).not.toHaveClass(/active/);
    await expect(buttons.nth(1)).toHaveClass(/active/);

    await buttons.nth(2).click();
    await expect(buttons.nth(1)).not.toHaveClass(/active/);
    await expect(buttons.nth(2)).toHaveClass(/active/);
  });

  test('chart fetches history data on load', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/monitoring/usd/history')),
      page.goto('/monitoring/usd'),
    ]);
    expect(response.status()).toBe(200);
  });

  test('switching range fetches new data', async ({ page }) => {
    await page.waitForResponse((r) => r.url().includes('/monitoring/usd/history'));

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('range=30d')),
      page.locator('.range-buttons button').nth(2).click(),
    ]);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.range).toBe('30d');
  });
});
