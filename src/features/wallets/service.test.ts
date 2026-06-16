import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  broadcastAppEvent: vi.fn(),
  prisma: {
    transaction: {
      count: vi.fn()
    },
    wallet: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('@/server/db', () => ({
  prisma: mocks.prisma
}));

vi.mock('@/server/events', () => ({
  broadcastAppEvent: mocks.broadcastAppEvent
}));

describe('wallet service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks deleting wallets with transactions', async () => {
    const { deleteMoneyWallet } = await import('./service');

    mocks.prisma.transaction.count.mockResolvedValue(2);

    await expect(deleteMoneyWallet({ id: 'wallet_1' })).rejects.toThrow(
      'Wallet has transactions'
    );
    expect(mocks.prisma.wallet.delete).not.toHaveBeenCalled();
  });

  it('broadcasts after creating a wallet', async () => {
    const { createMoneyWallet } = await import('./service');

    mocks.prisma.wallet.create.mockResolvedValue({
      color: '#059669',
      comment: null,
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      currency: 'USD',
      id: 'wallet_1',
      initialBalanceCents: 0,
      name: 'Main',
      status: 'ACTIVE',
      updatedAt: new Date('2026-06-16T00:00:00.000Z')
    });

    await createMoneyWallet({ name: 'Main' });

    expect(mocks.broadcastAppEvent).toHaveBeenCalledWith({
      type: 'money.updated',
      payload: { action: 'wallet.created', walletId: 'wallet_1' }
    });
  });
});
