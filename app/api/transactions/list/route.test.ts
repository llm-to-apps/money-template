import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { transactionFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listMoneyTransactions: vi.fn()
}));

vi.mock('@/server/auth', () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock('@/features/transactions/service', () => ({
  listMoneyTransactions: mocks.listMoneyTransactions
}));

describe('transaction list API route', () => {
  it('returns unauthorized for anonymous callers', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/transactions/list') as never
    );

    expect(response.status).toBe(401);
  });

  it('passes cursor query params to the transaction service', async () => {
    const transaction = transactionFactory({ id: 'transaction_1' });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_1' });
    mocks.listMoneyTransactions.mockResolvedValue({
      pageInfo: { hasNextPage: false, nextCursor: null },
      transactions: [transaction]
    });

    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest(
        'http://localhost/api/transactions/list?limit=12&cursor=transaction_0'
      ) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        pageInfo: { hasNextPage: false, nextCursor: null },
        transactions: [{ id: 'transaction_1' }]
      },
      ok: true
    });
    expect(mocks.listMoneyTransactions).toHaveBeenCalledWith({
      cursor: 'transaction_0',
      limit: '12'
    });
  });
});
