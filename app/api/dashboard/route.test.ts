import { describe, expect, it, vi } from 'vitest';

import { moneySnapshotFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getMoneySnapshot: vi.fn(),
  isManuallyLoggedOut: vi.fn()
}));

vi.mock('@/server/auth', () => ({
  getCurrentUser: mocks.getCurrentUser,
  isManuallyLoggedOut: mocks.isManuallyLoggedOut
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('dashboard API route', () => {
  it('returns redirect payload when dashboard fetch is unauthorized', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.isManuallyLoggedOut.mockResolvedValue(true);

    const { GET } = await import('./route');
    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        details: {
          redirectTo: '/auth/signed-out'
        }
      },
      ok: false
    });
  });

  it('returns the dashboard snapshot for the current user', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 'user_1',
      name: 'Local'
    });
    mocks.isManuallyLoggedOut.mockResolvedValue(false);
    mocks.getMoneySnapshot.mockResolvedValue(moneySnapshotFactory());

    const { GET } = await import('./route');
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        summary: { balanceCents: 9600 },
        user: { displayName: 'Local' }
      },
      ok: true
    });
  });
});
