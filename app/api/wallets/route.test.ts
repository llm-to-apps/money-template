import { describe, expect, it, vi } from 'vitest';

import { moneySnapshotFactory, walletFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  auditMoneyMutation: vi.fn(),
  authorizeMoneyMutation: vi.fn(),
  createMoneyWallet: vi.fn(),
  getCurrentUser: vi.fn(),
  getMoneySnapshot: vi.fn()
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

vi.mock('@/features/wallets/service', () => ({
  createMoneyWallet: mocks.createMoneyWallet
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('wallet API route', () => {
  it('returns a standard unauthorized error', async () => {
    mocks.authorizeMoneyMutation.mockResolvedValue({
      ok: false,
      response: Response.json(
        { code: 'UNAUTHORIZED', message: 'Unauthorized', ok: false },
        { status: 401 }
      )
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/wallets', {
        body: JSON.stringify({ name: 'Main' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }) as never
    );

    await expect(response.json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      ok: false
    });
    expect(response.status).toBe(401);
  });

  it('creates a wallet and returns a snapshot', async () => {
    const wallet = walletFactory({ id: 'wallet_new', name: 'Savings' });
    const snapshot = moneySnapshotFactory({ wallets: [wallet] });
    mocks.authorizeMoneyMutation.mockResolvedValue({
      ok: true,
      requestId: 'request_1',
      user: { id: 'user_1' }
    });
    mocks.createMoneyWallet.mockResolvedValue({ wallet });
    mocks.getMoneySnapshot.mockResolvedValue(snapshot);

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/wallets', {
        body: JSON.stringify({ name: 'Savings' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      wallets: [{ id: 'wallet_new', name: 'Savings' }]
    });
    expect(mocks.auditMoneyMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'wallet.created',
        metadata: { walletId: 'wallet_new' }
      })
    );
  });
});
