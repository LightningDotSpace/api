import { test, expect } from '@playwright/test';

test.describe('USD Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring/usd');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('lightning.space - USD Monitoring');
  });

  test('displays header and navigation', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('lightning.space - USD Monitoring');
    await expect(page.locator('.nav')).toContainText('Overview');
    await expect(page.locator('.nav')).toContainText('BTC Monitoring');
    await expect(page.locator('.nav a[href="/monitoring"]')).toBeVisible();
    await expect(page.locator('.nav a[href="/monitoring/btc"]')).toBeVisible();
  });

  test('displays USD Holdings Breakdown table', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'USD Holdings Breakdown' })).toBeVisible();

    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Check header columns
    await expect(table.locator('th').nth(0)).toHaveText('Token');
    await expect(table.locator('th').nth(1)).toHaveText('Chain');
    await expect(table.locator('th').nth(2)).toHaveText('USD');
  });

  test('shows all 4 USD token sources', async ({ page }) => {
    const table = page.locator('table').first();
    const rows = table.locator('tr').filter({ hasNot: page.locator('th') });
    // 4 token rows + 1 total row
    await expect(rows).toHaveCount(5);

    await expect(table).toContainText('JUSD');
    await expect(table).toContainText('USDC');
    // USDT appears twice (Ethereum + Polygon)
  });

  test('shows correct token balances', async ({ page }) => {
    const table = page.locator('table').first();

    // JUSD on Citrea: 57,999.35
    const jusdRow = table.locator('tr').filter({ has: page.locator('td:first-child', { hasText: /^JUSD$/ }) });
    await expect(jusdRow.locator('td').nth(1)).toHaveText('Citrea');
    await expect(jusdRow.locator('td.number')).toHaveText('57,999.35');

    // USDC on Ethereum: 839.99
    const usdcRow = table.locator('tr').filter({ has: page.locator('td:first-child', { hasText: /^USDC$/ }) });
    await expect(usdcRow.locator('td').nth(1)).toHaveText('Ethereum');
    await expect(usdcRow.locator('td.number')).toHaveText('839.99');
  });

  test('shows USDT on both Ethereum and Polygon', async ({ page }) => {
    const table = page.locator('table').first();
    const usdtRows = table.locator('tr').filter({ hasText: 'USDT' });
    await expect(usdtRows).toHaveCount(2);

    // USDT Ethereum: 2,630.35
    const usdtEth = usdtRows.filter({ hasText: 'Ethereum' });
    await expect(usdtEth.locator('td.number')).toHaveText('2,630.35');

    // USDT Polygon: 40,091.03
    const usdtPoly = usdtRows.filter({ hasText: 'Polygon' });
    await expect(usdtPoly.locator('td.number')).toHaveText('40,091.03');
  });

  test('displays correct total', async ({ page }) => {
    const table = page.locator('table').first();
    const totalRow = table.locator('tr.total-row');
    await expect(totalRow).toContainText('Total');

    // Total = 57999.35 + 839.99 + 2630.35 + 40091.03 = 101,560.72
    await expect(totalRow.locator('td.number')).toHaveText('101,560.72');
  });

  test('shows timestamp after data loads', async ({ page }) => {
    const timestamp = page.locator('#timestamp');
    await expect(timestamp).not.toHaveText('Loading...');
    await expect(timestamp).toContainText('Last updated:');
  });
});
