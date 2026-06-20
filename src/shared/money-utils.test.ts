import { describe, expect, it } from 'vitest';

import { formatMoney } from './money-utils';

describe('money utils', () => {
  it('formats known currency codes with locale symbols', () => {
    expect(formatMoney(12345, 'en-US', 'EUR')).toContain('€');
  });

  it('falls back to a numeric amount with custom currency labels', () => {
    expect(formatMoney(12345, 'en-US', 'USDT')).toBe('123.45 USDT');
  });
});
