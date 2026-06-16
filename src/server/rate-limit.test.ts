import { describe, expect, it } from 'vitest';

import { checkRateLimit, setRateLimitStore } from './rate-limit';

describe('rate limit store', () => {
  it('allows requests until the bucket limit is reached', () => {
    const buckets = new Map<string, { count: number; resetAt: number }>();
    setRateLimitStore({
      read: (key) => buckets.get(key),
      write: (key, bucket) => buckets.set(key, bucket)
    });

    expect(
      checkRateLimit({ key: 'user_1', limit: 2, windowMs: 1000 })
    ).toMatchObject({
      ok: true,
      remaining: 1
    });
    expect(
      checkRateLimit({ key: 'user_1', limit: 2, windowMs: 1000 })
    ).toMatchObject({
      ok: true,
      remaining: 0
    });
    expect(
      checkRateLimit({ key: 'user_1', limit: 2, windowMs: 1000 })
    ).toMatchObject({
      ok: false,
      remaining: 0
    });
  });
});
