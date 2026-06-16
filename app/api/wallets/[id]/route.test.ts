import { describe, expect, it, vi } from 'vitest';

import { walletFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  authorizeMoneyMutation: vi.fn(),
  deleteMoneyWallet: vi.fn(),
  getCurrentUser: vi.fn(),
  getMoneySnapshot: vi.fn(),
  getMoneyWallet: vi.fn(),
  updateMoneyWallet: vi.fn()
}));

vi.mock('@/server/auth', () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock('@/server/mutation-guard', () => ({
  authorizeMoneyMutation: mocks.authorizeMoneyMutation
}));

vi.mock('@/features/wallets/service', () => ({
  deleteMoneyWallet: mocks.deleteMoneyWallet,
  getMoneyWallet: mocks.getMoneyWallet,
  updateMoneyWallet: mocks.updateMoneyWallet
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('wallet detail API route', () => {
  it('returns one wallet by id', async () => {
    const wallet = walletFactory({ id: 'wallet_1' });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_1' });
    mocks.getMoneyWallet.mockResolvedValue({ wallet });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'wallet_1' })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      wallet: { id: 'wallet_1' }
    });
    expect(mocks.getMoneyWallet).toHaveBeenCalledWith({ id: 'wallet_1' });
  });
});
