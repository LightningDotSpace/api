import { test, expect } from '@playwright/test';

test.describe('BTC Monitoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitoring/btc');
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('lightning.space - BTC Monitoring');
  });

  test('displays header and navigation', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('lightning.space - BTC Monitoring');
    await expect(page.locator('.nav')).toContainText('Overview');
    await expect(page.locator('.nav')).toContainText('USD Monitoring');
    await expect(page.locator('.nav a[href="/monitoring"]')).toBeVisible();
    await expect(page.locator('.nav a[href="/monitoring/usd"]')).toBeVisible();
  });

  test('displays BTC Holdings Breakdown table', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'BTC Holdings Breakdown' })).toBeVisible();

    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Check header columns
    await expect(table.locator('th').nth(0)).toHaveText('Source');
    await expect(table.locator('th').nth(1)).toHaveText('Location');
    await expect(table.locator('th').nth(2)).toHaveText('BTC');

    // Check all 6 source rows exist
    const rows = table.locator('tr').filter({ hasNot: page.locator('th') });
    await expect(rows).toHaveCount(7); // 6 sources + 1 total row

    // Verify source names
    await expect(table).toContainText('Onchain BTC');
    await expect(table).toContainText('LND Onchain');
    await expect(table).toContainText('Lightning');
    await expect(table).toContainText('cBTC');
    await expect(table).toContainText('WBTC');
    await expect(table).toContainText('WBTCe');

    // Verify locations
    await expect(table).toContainText('Bitcoin');
    await expect(table).toContainText('LND Wallet');
    await expect(table).toContainText('LN Channels');
    await expect(table).toContainText('Citrea');
    await expect(table).toContainText('Ethereum');
  });

  test('correctly converts sats to BTC', async ({ page }) => {
    const table = page.locator('table').first();

    // Onchain BTC: 35390000 sats = 0.35390000 BTC
    const onchainRow = table.locator('tr').filter({ hasText: 'Onchain BTC' });
    await expect(onchainRow.locator('td.number')).toHaveText('0.35390000');

    // LND Onchain: 35300000 sats = 0.35300000 BTC
    const lndRow = table.locator('tr').filter({ hasText: 'LND Onchain' });
    await expect(lndRow.locator('td.number')).toHaveText('0.35300000');

    // Lightning: 128180000 sats = 1.28180000 BTC
    const lnRow = table.locator('tr').filter({ hasText: 'Lightning' });
    await expect(lnRow.locator('td.number')).toHaveText('1.28180000');

    // cBTC: 60010000 sats = 0.60010000 BTC
    const cbtcRow = table.locator('tr').filter({ hasText: /^cBTC/ });
    await expect(cbtcRow.locator('td.number')).toHaveText('0.60010000');
  });

  test('correctly shows EVM token balances in BTC', async ({ page }) => {
    const table = page.locator('table').first();

    // WBTC: 0.0037 BTC (already in BTC) - use td:first-child to match exactly
    const wbtcRow = table.locator('tr').filter({ has: page.locator('td:first-child', { hasText: /^WBTC$/ }) });
    await expect(wbtcRow.locator('td.number')).toHaveText('0.00370000');

    // WBTCe: 0.0012 BTC
    const wbtceRow = table.locator('tr').filter({ has: page.locator('td:first-child', { hasText: /^WBTCe$/ }) });
    await expect(wbtceRow.locator('td.number')).toHaveText('0.00120000');
  });

  test('displays correct total holdings', async ({ page }) => {
    const table = page.locator('table').first();
    const totalRow = table.locator('tr.total-row');
    await expect(totalRow).toContainText('Total');

    // Total = 0.3539 + 0.353 + 1.2818 + 0.6001 + 0.0037 + 0.0012 = 2.5937
    await expect(totalRow.locator('td.number')).toHaveText('2.59370000');
  });

  test('displays BTC Balance Sheet', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'BTC Balance Sheet' })).toBeVisible();

    const balanceTable = page.locator('table').nth(1);
    await expect(balanceTable).toBeVisible();

    await expect(balanceTable).toContainText('Total Holdings');
    await expect(balanceTable).toContainText('Customer Balance');
    await expect(balanceTable).toContainText('LDS Net Position');
  });

  test('shows correct customer balance as negative', async ({ page }) => {
    const balanceTable = page.locator('table').nth(1);
    const customerRow = balanceTable.locator('tr').filter({ hasText: 'Customer Balance' });
    // Customer: 161260000 sats = 1.6126 BTC, shown as -1.61260000
    await expect(customerRow.locator('td.number')).toHaveText('-1.61260000');
    await expect(customerRow.locator('td.number')).toHaveClass(/negative/);
  });

  test('shows correct net position with color', async ({ page }) => {
    const balanceTable = page.locator('table').nth(1);
    const netRow = balanceTable.locator('tr.total-row');
    // Net = 2.5937 - 1.6126 = 0.9811
    await expect(netRow.locator('td.number')).toHaveText('0.98110000');
    await expect(netRow.locator('td.number')).toHaveClass(/positive/);
  });

  test('shows timestamp after data loads', async ({ page }) => {
    const timestamp = page.locator('#timestamp');
    await expect(timestamp).not.toHaveText('Loading...');
    await expect(timestamp).toContainText('Last updated:');
  });
});
