import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/resolvers', () => ({
  resolveCategoryId: vi.fn().mockResolvedValue('category_1'),
  resolveWalletId: vi.fn().mockResolvedValue('wallet_1')
}));

describe('transaction filters', () => {
  it('builds bounded Prisma where filters', async () => {
    const { buildTransactionWhere } = await import('./filters');

    await expect(
      buildTransactionWhere({
        categoryName: 'Food',
        from: '2026-06-01',
        maxAmount: 20,
        minAmount: 10,
        parentCategoryName: 'Home',
        query: 'rent',
        to: '2026-06-30',
        type: 'EXPENSE',
        walletName: 'Main'
      })
    ).resolves.toMatchObject({
      amountCents: { gte: 1000, lte: 2000 },
      category: { parent: { name: { contains: 'Home' } } },
      categoryId: 'category_1',
      type: 'EXPENSE',
      walletId: 'wallet_1'
    });
  });

  it('rejects inverted ranges', async () => {
    const { buildTransactionWhere } = await import('./filters');

    await expect(
      buildTransactionWhere({ from: '2026-06-30', to: '2026-06-01' })
    ).rejects.toThrow('from must be before to');
    await expect(
      buildTransactionWhere({ minAmount: 20, maxAmount: 10 })
    ).rejects.toThrow('minAmount must be less than or equal to maxAmount');
  });
});
