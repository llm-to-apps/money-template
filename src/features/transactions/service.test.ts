import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryScope, RecordStatus, TransactionType } from '@prisma/client';

const mocks = vi.hoisted(() => ({
  broadcastAppEvent: vi.fn(),
  buildTransactionWhere: vi.fn(),
  prisma: {
    transaction: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  },
  resolveCategoryId: vi.fn(),
  resolveWalletId: vi.fn()
}));

vi.mock('@/server/db', () => ({
  prisma: mocks.prisma
}));

vi.mock('@/server/events', () => ({
  broadcastAppEvent: mocks.broadcastAppEvent
}));

vi.mock('@/server/money', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/money')>();

  return {
    ...actual,
    buildTransactionWhere: mocks.buildTransactionWhere,
    resolveCategoryId: mocks.resolveCategoryId,
    resolveWalletId: mocks.resolveWalletId
  };
});

describe('transaction service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildTransactionWhere.mockResolvedValue({ walletId: 'wallet_1' });
    mocks.resolveCategoryId.mockResolvedValue('category_1');
    mocks.resolveWalletId.mockResolvedValue('wallet_1');
  });

  it('creates transactions and broadcasts updates', async () => {
    const transaction = transactionRecord('transaction_created');
    mocks.prisma.transaction.create.mockResolvedValue(transaction);

    const { createMoneyTransaction } = await import('./service');

    await expect(
      createMoneyTransaction({
        amount: 12,
        categoryId: 'category_1',
        note: 'Lunch',
        type: 'EXPENSE',
        walletId: 'wallet_1'
      })
    ).resolves.toMatchObject({
      transaction: { amountCents: 1200, id: 'transaction_created' }
    });
    expect(mocks.prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountCents: 1200,
          categoryId: 'category_1',
          walletId: 'wallet_1'
        })
      })
    );
    expect(mocks.broadcastAppEvent).toHaveBeenCalledWith({
      type: 'money.updated',
      payload: {
        action: 'transaction.created',
        transactionId: 'transaction_created'
      }
    });
  });

  it('returns cursor page info for transaction lists', async () => {
    const first = transactionRecord('transaction_1');
    const second = transactionRecord('transaction_2');
    mocks.prisma.transaction.findMany.mockResolvedValue([first, second]);

    const { listMoneyTransactions } = await import('./service');

    await expect(
      listMoneyTransactions({ cursor: 'cursor_1', limit: 1 })
    ).resolves.toMatchObject({
      pageInfo: {
        hasNextPage: true,
        nextCursor: 'transaction_1'
      },
      transactions: [{ id: 'transaction_1' }]
    });
    expect(mocks.prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'cursor_1' },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: 1,
        take: 2,
        where: { walletId: 'wallet_1' }
      })
    );
  });

  it('gets, updates, and deletes transactions', async () => {
    const existing = transactionRecord('transaction_1');
    const updated = {
      ...existing,
      amountCents: 1500,
      note: 'Updated'
    };
    mocks.prisma.transaction.findUnique.mockResolvedValue(existing);
    mocks.prisma.transaction.update.mockResolvedValue(updated);
    mocks.prisma.transaction.delete.mockResolvedValue(updated);

    const {
      deleteMoneyTransaction,
      getMoneyTransaction,
      updateMoneyTransaction
    } = await import('./service');

    await expect(
      getMoneyTransaction({ id: 'transaction_1' })
    ).resolves.toMatchObject({
      transaction: { id: 'transaction_1' }
    });
    await expect(
      updateMoneyTransaction({
        amount: 15,
        id: 'transaction_1',
        note: 'Updated'
      })
    ).resolves.toMatchObject({
      transaction: { amountCents: 1500, note: 'Updated' }
    });
    await expect(
      deleteMoneyTransaction({ id: 'transaction_1' })
    ).resolves.toMatchObject({
      transaction: { id: 'transaction_1' }
    });
  });

  it('rejects missing transaction lookups', async () => {
    mocks.prisma.transaction.findUnique.mockResolvedValue(null);

    const { getMoneyTransaction } = await import('./service');

    await expect(getMoneyTransaction({ id: 'missing' })).rejects.toThrow(
      'transaction not found'
    );
  });
});

function transactionRecord(id: string) {
  const now = new Date('2026-06-16T12:00:00.000Z');
  const wallet = {
    color: '#059669',
    comment: null,
    createdAt: now,
    currency: 'USD',
    id: 'wallet_1',
    initialBalanceCents: 0,
    name: 'Main',
    status: RecordStatus.ACTIVE,
    updatedAt: now
  };
  const category = {
    color: '#2563eb',
    createdAt: now,
    id: 'category_1',
    name: 'Food',
    parent: null,
    parentId: null,
    scope: CategoryScope.EXPENSE,
    status: RecordStatus.ACTIVE,
    updatedAt: now
  };

  return {
    amountCents: 1200,
    category,
    categoryId: category.id,
    createdAt: now,
    id,
    note: 'Lunch',
    occurredAt: now,
    type: TransactionType.EXPENSE,
    updatedAt: now,
    wallet,
    walletId: wallet.id
  };
}
