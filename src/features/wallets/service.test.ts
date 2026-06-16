import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordStatus } from '@prisma/client';

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
      findUnique: vi.fn(),
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

  it('lists and gets wallets', async () => {
    const { getMoneyWallet, listMoneyWallets } = await import('./service');
    const wallet = walletRecord('wallet_1');

    mocks.prisma.wallet.findMany.mockResolvedValue([wallet]);
    mocks.prisma.wallet.findUnique.mockResolvedValue(wallet);

    await expect(
      listMoneyWallets({ includeArchived: false, query: 'Main' })
    ).resolves.toMatchObject({
      wallets: [{ id: 'wallet_1', name: 'Main' }]
    });
    expect(mocks.prisma.wallet.findMany).toHaveBeenCalledWith({
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      where: {
        name: { contains: 'Main' },
        status: 'ACTIVE'
      }
    });

    await expect(getMoneyWallet({ id: 'wallet_1' })).resolves.toMatchObject({
      wallet: { id: 'wallet_1' }
    });
  });

  it('rejects missing wallet lookups', async () => {
    const { getMoneyWallet } = await import('./service');

    mocks.prisma.wallet.findUnique.mockResolvedValue(null);

    await expect(getMoneyWallet({ id: 'missing' })).rejects.toThrow(
      'wallet not found'
    );
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

  it('updates and deletes wallets', async () => {
    const { deleteMoneyWallet, updateMoneyWallet } = await import('./service');
    const updated = { ...walletRecord('wallet_1'), initialBalanceCents: 2500 };

    mocks.prisma.wallet.update.mockResolvedValue(updated);
    mocks.prisma.transaction.count.mockResolvedValue(0);
    mocks.prisma.wallet.delete.mockResolvedValue(updated);

    await expect(
      updateMoneyWallet({
        id: 'wallet_1',
        initialBalance: 25,
        name: 'Updated'
      })
    ).resolves.toMatchObject({
      wallet: { id: 'wallet_1', initialBalanceCents: 2500 }
    });

    await expect(deleteMoneyWallet({ id: 'wallet_1' })).resolves.toMatchObject({
      wallet: { id: 'wallet_1' }
    });
  });

  it('maps Prisma not found errors for wallet mutations', async () => {
    const { deleteMoneyWallet, updateMoneyWallet } = await import('./service');
    const notFound = { code: 'P2025' };

    mocks.prisma.wallet.update.mockRejectedValue(notFound);
    mocks.prisma.transaction.count.mockResolvedValue(0);
    mocks.prisma.wallet.delete.mockRejectedValue(notFound);

    await expect(
      updateMoneyWallet({ id: 'missing', name: 'Missing' })
    ).rejects.toThrow('wallet not found');
    await expect(deleteMoneyWallet({ id: 'missing' })).rejects.toThrow(
      'wallet not found'
    );
  });
});

function walletRecord(id: string) {
  const now = new Date('2026-06-16T00:00:00.000Z');

  return {
    color: '#059669',
    comment: null,
    createdAt: now,
    currency: 'USD',
    id,
    initialBalanceCents: 0,
    name: 'Main',
    status: RecordStatus.ACTIVE,
    updatedAt: now
  };
}
