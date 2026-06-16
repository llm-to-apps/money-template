import { describe, expect, it } from 'vitest';
import { CategoryScope, RecordStatus, TransactionType } from '@prisma/client';

import {
  categoryLabel,
  centsFromAmount,
  serializeCategory,
  serializeTransaction,
  serializeWallet
} from './serializers';

const now = new Date('2026-06-16T12:00:00.000Z');

describe('server serializers', () => {
  it('rounds major currency units to cents', () => {
    expect(centsFromAmount(12.345)).toBe(1235);
  });

  it('builds category labels', () => {
    expect(categoryLabel({ name: 'Fuel', parent: { name: 'Car' } })).toBe(
      'Car / Fuel'
    );
    expect(categoryLabel({ name: 'Food' })).toBe('Food');
  });

  it('serializes nested transaction records', () => {
    const wallet = {
      balanceCents: 0,
      color: '#059669',
      comment: null,
      createdAt: now,
      currency: 'USD',
      id: 'wallet_1',
      initialBalanceCents: 0,
      name: 'Main',
      status: RecordStatus.ACTIVE,
      updatedAt: now
    };
    const category = {
      color: '#2563eb',
      createdAt: now,
      id: 'category_1',
      name: 'Fuel',
      parent: {
        color: '#2563eb',
        createdAt: now,
        id: 'category_parent',
        name: 'Car',
        parentId: null,
        scope: CategoryScope.BOTH,
        status: RecordStatus.ACTIVE,
        updatedAt: now
      },
      parentId: 'category_parent',
      scope: CategoryScope.EXPENSE,
      status: RecordStatus.ACTIVE,
      updatedAt: now
    };
    const transaction = serializeTransaction({
      amountCents: 1200,
      category,
      categoryId: category.id,
      createdAt: now,
      id: 'transaction_1',
      note: 'Gas',
      occurredAt: now,
      type: TransactionType.EXPENSE,
      updatedAt: now,
      wallet,
      walletId: wallet.id
    });

    expect(serializeWallet(wallet)).toMatchObject({
      createdAt: now.toISOString()
    });
    expect(serializeCategory(category)).toMatchObject({ label: 'Car / Fuel' });
    expect(transaction).toMatchObject({
      category: { label: 'Car / Fuel' },
      occurredAt: now.toISOString(),
      wallet: { id: 'wallet_1' }
    });
  });
});
