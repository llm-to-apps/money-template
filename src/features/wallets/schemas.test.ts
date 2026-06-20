import { describe, expect, it } from 'vitest';

import {
  parseCreateWalletInput,
  parseListWalletsInput,
  parseUpdateWalletInput
} from './schemas';

describe('wallet schemas', () => {
  it('parses wallet create defaults', () => {
    expect(parseCreateWalletInput({ name: 'Main' })).toEqual({
      color: '#059669',
      comment: null,
      currency: 'USD',
      initialBalance: 0,
      name: 'Main'
    });
  });

  it('parses list filters', () => {
    expect(
      parseListWalletsInput({ includeArchived: true, query: ' cash ' })
    ).toEqual({
      includeArchived: true,
      query: 'cash'
    });
  });

  it('normalizes wallet currency codes', () => {
    expect(
      parseCreateWalletInput({ name: 'Euro', currency: ' eur ' })
    ).toMatchObject({
      currency: 'EUR'
    });
    expect(
      parseUpdateWalletInput({ id: 'wallet_1', currency: ' custom ' })
    ).toMatchObject({
      data: { currency: 'CUSTOM' },
      id: 'wallet_1'
    });
  });

  it('requires at least one update field', () => {
    expect(() => parseUpdateWalletInput({ id: 'wallet_1' })).toThrow(
      'at least one wallet field is required'
    );
  });
});
