import { describe, expect, it, vi } from 'vitest';

import {
  moneySnapshotFactory,
  transactionFactory
} from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  auditMoneyMutation: vi.fn(),
  authorizeMoneyMutation: vi.fn(),
  createMoneyTransaction: vi.fn(),
  getMoneySnapshot: vi.fn()
}));

vi.mock('@/server/mutation-guard', () => ({
  authorizeMoneyMutation: mocks.authorizeMoneyMutation
}));

vi.mock('@/server/audit', () => ({
  auditMoneyMutation: mocks.auditMoneyMutation
}));

vi.mock('@/features/transactions/service', () => ({
  createMoneyTransaction: mocks.createMoneyTransaction
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('transaction API route', () => {
  it('creates a JSON transaction and returns a snapshot', async () => {
    const transaction = transactionFactory({ id: 'transaction_new' });
    mocks.authorizeMoneyMutation.mockResolvedValue({
      ok: true,
      requestId: 'request_1',
      user: { id: 'user_1' }
    });
    mocks.createMoneyTransaction.mockResolvedValue({ transaction });
    mocks.getMoneySnapshot.mockResolvedValue(
      moneySnapshotFactory({
        initialTransactionsPage: {
          pageInfo: { hasNextPage: false, nextCursor: null },
          transactions: [transaction]
        }
      })
    );

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/transactions', {
        body: JSON.stringify({
          amount: 24,
          categoryId: transaction.categoryId,
          occurredAt: '2026-06-16',
          type: 'EXPENSE',
          walletId: transaction.walletId
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        initialTransactionsPage: {
          transactions: [{ id: 'transaction_new' }]
        }
      },
      ok: true
    });
    expect(mocks.auditMoneyMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'transaction.created',
        metadata: { transactionId: 'transaction_new' }
      })
    );
  });
});
