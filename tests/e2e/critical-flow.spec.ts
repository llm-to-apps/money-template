import { expect, test } from '@playwright/test';

test('health endpoint is available', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ ok: true });
});

test('signed-out page renders without auth or database access', async ({
  page
}) => {
  await page.goto('/auth/signed-out');

  await expect(
    page.getByRole('heading', { name: /signed out/i })
  ).toBeVisible();
});

test('signed-out page renders on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/auth/signed-out');

  await expect(
    page.getByRole('heading', { name: /signed out/i })
  ).toBeVisible();
});

test.describe('database-backed local flows', () => {
  test.skip(
    process.env.RUN_DB_E2E !== '1',
    'Set RUN_DB_E2E=1 with a migrated local DATABASE_URL to run CRUD flows.'
  );

  test('creates wallet, category, and transaction in local auth mode', async ({
    page
  }) => {
    const suffix = Date.now().toString(36);
    const walletName = `E2E Wallet ${suffix}`;
    const categoryName = `E2E Category ${suffix}`;

    await page.goto('/wallets/new');
    await page.getByLabel('Name').fill(walletName);
    await page.getByRole('combobox', { name: 'Currency' }).fill('USD');
    await page.getByLabel('Initial balance').fill('100');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(walletName)).toBeVisible();

    await page.goto('/categories/new');
    await page.getByLabel('Name').fill(categoryName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(categoryName)).toBeVisible();

    await page.goto('/transactions/new');
    await page.getByLabel('Amount').fill('12.34');
    await page.getByLabel('Note').fill(`E2E transaction ${suffix}`);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`E2E transaction ${suffix}`)).toBeVisible();
  });
});
