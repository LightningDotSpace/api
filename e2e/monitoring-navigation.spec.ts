import { test, expect } from '@playwright/test';

test.describe('Monitoring Navigation', () => {
  test('main monitoring page has links to BTC and USD pages', async ({ page }) => {
    await page.goto('/monitoring');
    await expect(page.locator('a[href="/monitoring/btc"]')).toBeVisible();
    await expect(page.locator('a[href="/monitoring/usd"]')).toBeVisible();
  });

  test('BTC page links to overview and USD', async ({ page }) => {
    await page.goto('/monitoring/btc');
    await expect(page.locator('a[href="/monitoring"]')).toBeVisible();
    await expect(page.locator('a[href="/monitoring/usd"]')).toBeVisible();
  });

  test('USD page links to overview and BTC', async ({ page }) => {
    await page.goto('/monitoring/usd');
    await expect(page.locator('a[href="/monitoring"]')).toBeVisible();
    await expect(page.locator('a[href="/monitoring/btc"]')).toBeVisible();
  });

  test('can navigate from main to BTC page', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('a[href="/monitoring/btc"]');
    await expect(page).toHaveTitle('lightning.space - BTC Monitoring');
  });

  test('can navigate from main to USD page', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('a[href="/monitoring/usd"]');
    await expect(page).toHaveTitle('lightning.space - USD Monitoring');
  });

  test('can navigate between BTC and USD pages', async ({ page }) => {
    await page.goto('/monitoring/btc');
    await page.click('a[href="/monitoring/usd"]');
    await expect(page).toHaveTitle('lightning.space - USD Monitoring');

    await page.click('a[href="/monitoring/btc"]');
    await expect(page).toHaveTitle('lightning.space - BTC Monitoring');
  });
});
