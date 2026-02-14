import { test, expect } from '@playwright/test';

test.describe('BTC Monitoring Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring/btc');
  });

  test('displays chart section with canvas', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'BTC Balance History' })).toBeVisible();
    await expect(page.locator('#btcChart')).toBeVisible();
  });

  test('displays range buttons with 24h active by default', async ({ page }) => {
    const buttons = page.locator('.range-buttons button');
    await expect(buttons).toHaveCount(3);
    await expect(buttons.nth(0)).toHaveText('24h');
    await expect(buttons.nth(1)).toHaveText('7d');
    await expect(buttons.nth(2)).toHaveText('30d');

    await expect(buttons.nth(0)).toHaveClass(/active/);
    await expect(buttons.nth(1)).not.toHaveClass(/active/);
    await expect(buttons.nth(2)).not.toHaveClass(/active/);
  });

  test('switching range updates active button', async ({ page }) => {
    const buttons = page.locator('.range-buttons button');

    await buttons.nth(1).click();
    await expect(buttons.nth(0)).not.toHaveClass(/active/);
    await expect(buttons.nth(1)).toHaveClass(/active/);

    await buttons.nth(2).click();
    await expect(buttons.nth(1)).not.toHaveClass(/active/);
    await expect(buttons.nth(2)).toHaveClass(/active/);

    await buttons.nth(0).click();
    await expect(buttons.nth(2)).not.toHaveClass(/active/);
    await expect(buttons.nth(0)).toHaveClass(/active/);
  });

  test('chart fetches history data on load', async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/monitoring/btc/history')),
      page.goto('/monitoring/btc'),
    ]);
    expect(response.status()).toBe(200);
  });

  test('switching range fetches new data', async ({ page }) => {
    await page.waitForResponse((r) => r.url().includes('/monitoring/btc/history'));

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('range=7d')),
      page.locator('.range-buttons button').nth(1).click(),
    ]);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.range).toBe('7d');
  });
});
