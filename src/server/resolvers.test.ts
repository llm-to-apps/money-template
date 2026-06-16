import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    category: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    wallet: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

vi.mock('@/server/db', () => ({
  prisma: mocks.prisma
}));

describe('server resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves existing wallet ids and rejects missing ids', async () => {
    const { resolveWalletId } = await import('./resolvers');
    mocks.prisma.wallet.findUnique.mockResolvedValueOnce({ id: 'wallet_1' });

    await expect(resolveWalletId({ walletId: 'wallet_1' })).resolves.toBe(
      'wallet_1'
    );

    mocks.prisma.wallet.findUnique.mockResolvedValueOnce(null);
    await expect(resolveWalletId({ walletId: 'missing' })).rejects.toThrow(
      'walletId does not exist'
    );
  });

  it('upserts wallet names and creates a default wallet when needed', async () => {
    const { getDefaultWalletId, resolveWalletId } = await import('./resolvers');
    mocks.prisma.wallet.upsert.mockResolvedValueOnce({ id: 'wallet_named' });
    mocks.prisma.wallet.findFirst.mockResolvedValueOnce(null);
    mocks.prisma.wallet.create.mockResolvedValueOnce({ id: 'wallet_default' });

    await expect(resolveWalletId({ walletName: 'Savings' })).resolves.toBe(
      'wallet_named'
    );
    await expect(getDefaultWalletId()).resolves.toBe('wallet_default');
  });

  it('upserts category paths one segment at a time', async () => {
    const { upsertCategoryPath } = await import('./resolvers');
    mocks.prisma.category.findFirst
      .mockResolvedValueOnce({ id: 'category_car' })
      .mockResolvedValueOnce(null);
    mocks.prisma.category.update.mockResolvedValueOnce({ id: 'category_car' });
    mocks.prisma.category.create.mockResolvedValueOnce({ id: 'category_fuel' });

    await expect(
      upsertCategoryPath('Car / Fuel', {
        color: '#2563eb',
        scope: 'EXPENSE'
      })
    ).resolves.toBe('category_fuel');

    expect(mocks.prisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'ACTIVE' },
        where: { id: 'category_car' }
      })
    );
    expect(mocks.prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Fuel',
          parentId: 'category_car',
          scope: 'EXPENSE'
        })
      })
    );
  });

  it('requires a category id or name', async () => {
    const { resolveCategoryId } = await import('./resolvers');

    await expect(resolveCategoryId({})).rejects.toThrow(
      'categoryId or categoryName is required'
    );
  });
});
