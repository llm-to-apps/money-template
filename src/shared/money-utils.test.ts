import { describe, expect, it } from 'vitest';

import {
  formatDateInputValue,
  formatMoney,
  getInitialMainCategoryId,
  getInitialSubcategoryId,
  routeModeFromPathname,
  viewFromPathname
} from './money-utils';
import type { CategoryRecord } from './money-types';

function category(
  id: string,
  name: string,
  parentId: string | null = null
): CategoryRecord {
  return {
    color: '#16a34a',
    createdAt: '2026-06-21T00:00:00.000Z',
    id,
    status: 'ACTIVE',
    label: name,
    name,
    parent: null,
    parentId,
    scope: 'BOTH',
    updatedAt: '2026-06-21T00:00:00.000Z'
  };
}

describe('money utils', () => {
  it('formats known currency codes with locale symbols', () => {
    expect(formatMoney(12345, 'en-US', 'EUR')).toContain('€');
  });

  it('falls back to a numeric amount with custom currency labels', () => {
    expect(formatMoney(12345, 'en-US', 'USDT')).toBe('123.45 USDT');
  });

  it('formats dates for date inputs and handles invalid values', () => {
    expect(formatDateInputValue('2026-06-21T12:34:00.000Z')).toBe('2026-06-21');
    expect(formatDateInputValue('not-a-date')).toBe('');
  });

  it('detects the active money view from the pathname', () => {
    expect(viewFromPathname('/transactions')).toBe('transactions');
    expect(viewFromPathname('/wallets/wallet_1/edit')).toBe('wallets');
    expect(viewFromPathname('/categories/new')).toBe('categories');
    expect(viewFromPathname('/')).toBe('dashboard');
  });

  it('detects route modes from nested money paths', () => {
    expect(routeModeFromPathname('/transactions/new')).toEqual({
      action: 'new'
    });
    expect(routeModeFromPathname('/wallets/wallet_1/edit')).toEqual({
      action: 'edit',
      id: 'wallet_1'
    });
    expect(routeModeFromPathname('/categories')).toEqual({
      action: 'list'
    });
  });

  it('chooses initial category selections from defaults and fallbacks', () => {
    const categories = [
      category('income', 'Income'),
      category('salary', 'Salary', 'income'),
      category('food', 'Food')
    ];

    expect(getInitialMainCategoryId(categories, 'salary')).toBe('income');
    expect(getInitialMainCategoryId(categories, 'food')).toBe('food');
    expect(getInitialMainCategoryId(categories, 'missing')).toBe('income');
    expect(getInitialSubcategoryId(categories, 'salary', 'income')).toBe(
      'salary'
    );
    expect(getInitialSubcategoryId(categories, 'food', 'income')).toBe(
      'salary'
    );
    expect(getInitialSubcategoryId(categories, 'missing', 'food')).toBe('');
  });
});
