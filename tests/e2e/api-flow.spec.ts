import { expect, test } from '@playwright/test';

test.describe('database-backed API flows', () => {
  test.skip(
    process.env.RUN_DB_E2E !== '1',
    'Set RUN_DB_E2E=1 with a migrated local DATABASE_URL to run API CRUD flows.'
  );

  test('creates wallet, category, and transaction through JSON APIs', async ({
    request
  }) => {
    const suffix = Date.now().toString(36);
    const walletName = `API Wallet ${suffix}`;
    const categoryName = `API Category ${suffix}`;

    const walletResponse = await request.post('/api/wallets', {
      data: {
        name: walletName,
        currency: 'USD',
        initialBalance: 100
      }
    });
    expect(walletResponse.ok()).toBe(true);
    const walletSnapshot = await walletResponse.json();
    const wallet = walletSnapshot.wallets.find(
      (item: { name: string }) => item.name === walletName
    );
    expect(wallet).toBeTruthy();

    const categoryResponse = await request.post('/api/categories', {
      data: {
        name: categoryName,
        scope: 'EXPENSE'
      }
    });
    expect(categoryResponse.ok()).toBe(true);
    const categorySnapshot = await categoryResponse.json();
    const category = categorySnapshot.categories.find(
      (item: { name: string }) => item.name === categoryName
    );
    expect(category).toBeTruthy();

    const transactionResponse = await request.post('/api/transactions', {
      data: {
        amount: 42.5,
        categoryId: category.id,
        note: `API transaction ${suffix}`,
        occurredAt: '2026-06-16',
        type: 'EXPENSE',
        walletId: wallet.id
      }
    });
    expect(transactionResponse.ok()).toBe(true);
    await expect(transactionResponse.json()).resolves.toMatchObject({
      initialTransactionsPage: {
        transactions: expect.arrayContaining([
          expect.objectContaining({
            note: `API transaction ${suffix}`,
            walletId: wallet.id
          })
        ])
      }
    });
  });
});
