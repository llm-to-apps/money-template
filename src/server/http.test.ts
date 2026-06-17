import { describe, expect, it } from 'vitest';

import { jsonError, jsonOk } from './http';

describe('HTTP response helpers', () => {
  it('serializes JSON error responses', async () => {
    const response = jsonError({
      code: 'RATE_LIMITED',
      message: 'Too many requests'
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests'
      }
    });
  });

  it('serializes JSON success responses', async () => {
    const response = jsonOk({ id: 'item_1' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { id: 'item_1' }
    });
  });
});
