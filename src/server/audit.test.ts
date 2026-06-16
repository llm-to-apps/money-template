import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logInfo: vi.fn(),
  prisma: {
    auditEvent: {
      create: vi.fn()
    }
  }
}));

vi.mock('@/server/db', () => ({
  prisma: mocks.prisma
}));

vi.mock('@/server/logger', () => ({
  logInfo: mocks.logInfo
}));

describe('audit events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists and logs money mutation audits', async () => {
    const { auditMoneyMutation } = await import('./audit');
    mocks.prisma.auditEvent.create.mockResolvedValue({});

    await auditMoneyMutation({
      action: 'wallet.created',
      metadata: { walletId: 'wallet_1' },
      requestId: 'request_1',
      userId: 'user_1'
    });

    expect(mocks.prisma.auditEvent.create).toHaveBeenCalledWith({
      data: {
        action: 'wallet.created',
        metadata: JSON.stringify({ walletId: 'wallet_1' }),
        requestId: 'request_1',
        userId: 'user_1'
      }
    });
    expect(mocks.logInfo).toHaveBeenCalledWith(
      'money mutation audited',
      expect.objectContaining({ action: 'wallet.created', audit: true })
    );
  });
});
