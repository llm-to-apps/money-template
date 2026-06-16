import { describe, expect, it } from 'vitest';

import {
  parseCreateTransactionInput,
  parseListTransactionsInput,
  parseUpdateTransactionInput
} from './schemas';

describe('transaction schemas', () => {
  it('parses a valid create transaction input', () => {
    const input = parseCreateTransactionInput({
      amount: 12.5,
      note: 'Lunch',
      occurredAt: '2026-06-16',
      type: 'EXPENSE'
    });

    expect(input).toMatchObject({
      amount: 12.5,
      note: 'Lunch',
      type: 'EXPENSE'
    });
    expect(input.occurredAt).toBeInstanceOf(Date);
  });

  it('rejects invalid create transaction amounts', () => {
    expect(() =>
      parseCreateTransactionInput({ amount: 0, type: 'EXPENSE' })
    ).toThrow('amount must be a positive number');
  });

  it('bounds list limits', () => {
    expect(parseListTransactionsInput({ limit: 500 }).limit).toBe(50);
    expect(parseListTransactionsInput({ limit: -10 }).limit).toBe(1);
    expect(parseListTransactionsInput({}).limit).toBe(12);
    expect(parseListTransactionsInput({ cursor: 'txn_1' }).cursor).toBe(
      'txn_1'
    );
  });

  it('requires at least one update field', () => {
    expect(() => parseUpdateTransactionInput({ id: 'txn_1' })).toThrow(
      'at least one transaction field is required'
    );
  });
});
