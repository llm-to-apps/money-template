import { describe, expect, it } from 'vitest';

import {
  appErrorFromUnknown,
  errorStatus,
  fail,
  jsonError,
  ok
} from './result';

describe('result helpers', () => {
  it('creates success and failure results', () => {
    expect(ok({ id: 'item_1' })).toEqual({
      ok: true,
      data: { id: 'item_1' }
    });
    expect(fail('BAD_REQUEST', 'Invalid')).toEqual({
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid' }
    });
  });

  it('maps known error messages to HTTP status codes', () => {
    expect(appErrorFromUnknown(new Error('Unauthorized'))).toMatchObject({
      code: 'UNAUTHORIZED'
    });
    expect(appErrorFromUnknown(new Error('wallet not found'))).toMatchObject({
      code: 'NOT_FOUND'
    });
    expect(
      appErrorFromUnknown(new Error('Wallet has transactions'))
    ).toMatchObject({ code: 'CONFLICT' });
    expect(appErrorFromUnknown(new Error('Invalid input'))).toMatchObject({
      code: 'BAD_REQUEST'
    });
  });

  it('maps app error codes to HTTP statuses', () => {
    expect(errorStatus('UNAUTHORIZED')).toBe(401);
    expect(errorStatus('NOT_FOUND')).toBe(404);
    expect(errorStatus('CONFLICT')).toBe(409);
    expect(errorStatus('RATE_LIMITED')).toBe(429);
    expect(errorStatus('BAD_REQUEST')).toBe(400);
    expect(errorStatus('INTERNAL_ERROR')).toBe(500);
  });

  it('serializes JSON error responses', async () => {
    const response = jsonError({
      code: 'RATE_LIMITED',
      message: 'Too many requests'
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests'
    });
  });
});
