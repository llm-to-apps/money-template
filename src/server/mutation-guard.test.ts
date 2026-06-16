import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getCurrentUser: vi.fn()
}));

vi.mock('@/server/auth', () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock('@/server/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit
}));

describe('mutation guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects anonymous mutation requests', async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const { authorizeMoneyMutation } = await import('./mutation-guard');
    const result = await authorizeMoneyMutation(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it('rejects rate limited mutation requests', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_1' });
    mocks.checkRateLimit.mockReturnValue({ ok: false });

    const { authorizeMoneyMutation } = await import('./mutation-guard');
    const result = await authorizeMoneyMutation(request());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(429);
    }
  });

  it('authorizes known users inside the mutation limit', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_1', name: 'Local' });
    mocks.checkRateLimit.mockReturnValue({ ok: true });

    const { authorizeMoneyMutation } = await import('./mutation-guard');
    const result = await authorizeMoneyMutation(request());

    expect(result).toMatchObject({
      ok: true,
      requestId: expect.any(String),
      user: { id: 'user_1' }
    });
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining('mutation:')
      })
    );
  });
});

function request() {
  return new NextRequest('http://localhost/api/transactions', {
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'x-request-id': 'request_1'
    }
  });
}
