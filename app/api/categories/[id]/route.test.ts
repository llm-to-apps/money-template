import { describe, expect, it, vi } from 'vitest';

import { categoryFactory } from '@/tests/factories/money';

const mocks = vi.hoisted(() => ({
  authorizeMoneyMutation: vi.fn(),
  deleteMoneyCategory: vi.fn(),
  getCurrentUser: vi.fn(),
  getMoneyCategory: vi.fn(),
  getMoneySnapshot: vi.fn(),
  updateMoneyCategory: vi.fn()
}));

vi.mock('@/server/auth', () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock('@/server/mutation-guard', () => ({
  authorizeMoneyMutation: mocks.authorizeMoneyMutation
}));

vi.mock('@/features/categories/service', () => ({
  deleteMoneyCategory: mocks.deleteMoneyCategory,
  getMoneyCategory: mocks.getMoneyCategory,
  updateMoneyCategory: mocks.updateMoneyCategory
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

describe('category detail API route', () => {
  it('returns one category by id', async () => {
    const category = categoryFactory({ id: 'category_1' });
    mocks.getCurrentUser.mockResolvedValue({ id: 'user_1' });
    mocks.getMoneyCategory.mockResolvedValue({ category });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost') as never, {
      params: Promise.resolve({ id: 'category_1' })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        category: { id: 'category_1' }
      },
      ok: true
    });
    expect(mocks.getMoneyCategory).toHaveBeenCalledWith({ id: 'category_1' });
  });
});
