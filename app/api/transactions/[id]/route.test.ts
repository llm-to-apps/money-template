import { describe, expect, it, vi } from 'vitest';

import { transactionFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  auditMoneyMutation: vi.fn(),
  authorizeMoneyMutation: vi.fn(),
  deleteMoneyTransaction: vi.fn(),
  getCurrentUser: vi.fn(),
  getMoneySnapshot: vi.fn(),
  getMoneyTransaction: vi.fn(),
  updateMoneyTransaction: vi.fn()
}));

vi.mock('@/server/auth', () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock('@/server/mutation-guard', () => ({
  authorizeMoneyMutation: mocks.authorizeMoneyMutation
}));

vi.mock('@/server/audit', () => ({
  auditMoneyMutation: mocks.auditMoneyMutation
}));

vi.mock('@/features/transactions/service', () => ({
  deleteMoneyTransaction: mocks.deleteMoneyTransaction,
  getMoneyTransaction: mocks.getMoneyTransaction,
  updateMoneyTransaction: mocks.updateMoneyTransaction
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('transaction detail API route', () => {
  it('returns unauthorized for anonymous callers', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'transaction_1' })
    });

    expect(response.status).toBe(401);
  });

  it('returns one transaction by id', async () => {
    const transaction = transactionFactory({ id: 'transaction_1' });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_1' });
    mocks.getMoneyTransaction.mockResolvedValue({ transaction });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'transaction_1' })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        transaction: { id: 'transaction_1' }
      },
      ok: true
    });
    expect(mocks.getMoneyTransaction).toHaveBeenCalledWith({
      id: 'transaction_1'
    });
  });
});
