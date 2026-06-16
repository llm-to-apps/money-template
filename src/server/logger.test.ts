import { afterEach, describe, expect, it, vi } from 'vitest';

import { logError, logInfo, logWarn } from './logger';

describe('server logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes structured info, warning, and error logs', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    logInfo('started', { requestId: 'request_1' });
    logWarn('careful');
    logError('failed', { code: 'BAD_REQUEST' });

    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({
      app: 'money',
      level: 'info',
      message: 'started',
      requestId: 'request_1'
    });
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toMatchObject({
      app: 'money',
      level: 'warn',
      message: 'careful'
    });
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toMatchObject({
      app: 'money',
      code: 'BAD_REQUEST',
      level: 'error',
      message: 'failed'
    });
  });
});
