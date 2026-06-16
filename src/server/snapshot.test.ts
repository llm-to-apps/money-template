import { beforeEach, describe, expect, it, vi } from 'vitest';

const now = new Date('2026-06-16T12:00:00.000Z');

const wallet = {
  color: '#059669',
  comment: null,
  createdAt: now,
  currency: 'USD',
  id: 'wallet_1',
  initialBalanceCents: 10_000,
  name: 'Main',
  status: 'ACTIVE',
  updatedAt: now
};

const category = {
  color: '#ef4444',
  createdAt: now,
  id: 'category_1',
  name: 'Fuel',
  parent: null,
  parentId: null,
  scope: 'EXPENSE',
  status: 'ACTIVE',
  updatedAt: now
};

const income = {
  amountCents: 50_000,
  category,
  categoryId: category.id,
  createdAt: now,
  id: 'transaction_income',
  note: 'Salary',
  occurredAt: now,
  type: 'INCOME',
  updatedAt: now,
  wallet,
  walletId: wallet.id
};

const expense = {
  amountCents: 12_500,
  category,
  categoryId: category.id,
  createdAt: now,
  id: 'transaction_expense',
  note: 'Fuel',
  occurredAt: now,
  type: 'EXPENSE',
  updatedAt: now,
  wallet,
  walletId: wallet.id
};

const mocks = vi.hoisted(() => ({
  prisma: {
    category: {
      findMany: vi.fn()
    },
    transaction: {
      findMany: vi.fn(),
      groupBy: vi.fn()
    },
    wallet: {
      findMany: vi.fn()
    }
  }
}));

vi.mock('@/server/db', () => ({
  prisma: mocks.prisma
}));

describe('money snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it('builds summary, wallet balances, breakdown, and month dynamics', async () => {
    const { getMoneySnapshot } = await import('./snapshot');
    mocks.prisma.wallet.findMany.mockResolvedValue([wallet]);
    mocks.prisma.category.findMany.mockResolvedValue([category]);
    mocks.prisma.transaction.findMany
      .mockResolvedValueOnce([expense])
      .mockResolvedValueOnce([income, expense])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([income, expense]);
    mocks.prisma.transaction.groupBy
      .mockResolvedValueOnce([
        { type: 'INCOME', _sum: { amountCents: 50_000 } },
        { type: 'EXPENSE', _sum: { amountCents: 12_500 } }
      ])
      .mockResolvedValueOnce([
        { walletId: wallet.id, type: 'INCOME', _sum: { amountCents: 50_000 } },
        { walletId: wallet.id, type: 'EXPENSE', _sum: { amountCents: 12_500 } }
      ]);

    await expect(getMoneySnapshot()).resolves.toMatchObject({
      categoryBreakdown: [
        {
          amountCents: 12_500,
          categoryId: category.id,
          label: 'Fuel'
        }
      ],
      summary: {
        balanceCents: 37_500,
        currentMonth: {
          balanceCents: 37_500,
          expensesCents: 12_500,
          incomeCents: 50_000
        }
      },
      wallets: [
        {
          balanceCents: 47_500,
          id: wallet.id
        }
      ]
    });
  });
});
