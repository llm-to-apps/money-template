import { describe, expect, it, vi } from 'vitest';

import { categoryFactory, moneySnapshotFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  auditMoneyMutation: vi.fn(),
  authorizeMoneyMutation: vi.fn(),
  createMoneyCategory: vi.fn(),
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

vi.mock('@/features/categories/service', () => ({
  createMoneyCategory: mocks.createMoneyCategory
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('category API route', () => {
  it('creates a category and returns a snapshot', async () => {
    const category = categoryFactory({ id: 'category_new', name: 'Travel' });
    mocks.authorizeMoneyMutation.mockResolvedValue({
      ok: true,
      requestId: 'request_1',
      user: { id: 'user_1' }
    });
    mocks.createMoneyCategory.mockResolvedValue({ category });
    mocks.getMoneySnapshot.mockResolvedValue(
      moneySnapshotFactory({ categories: [category] })
    );

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/categories', {
        body: JSON.stringify({ name: 'Travel' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST'
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      categories: [{ id: 'category_new', name: 'Travel' }]
    });
    expect(mocks.auditMoneyMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'category.created',
        metadata: { categoryId: 'category_new' }
      })
    );
  });
});
