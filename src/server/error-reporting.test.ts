import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('server error reporting', () => {
  afterEach(() => {
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('does not send errors when Sentry is not configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    process.env = { NODE_ENV: 'test' } as NodeJS.ProcessEnv;

    const { reportErrorToSentry } = await import('./error-reporting');

    await expect(
      reportErrorToSentry({
        error: new Error('Failed'),
        event: 'test.failed'
      })
    ).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a redacted Sentry envelope when Sentry is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    process.env = {
      NODE_ENV: 'production',
      SENTRY_DSN: 'https://public@example.sentry.io/123',
      SENTRY_RELEASE: 'money@1.0.0'
    } as NodeJS.ProcessEnv;

    const { reportErrorToSentry } = await import('./error-reporting');

    await expect(
      reportErrorToSentry({
        context: {
          requestId: 'request_1',
          token: 'secret-token'
        },
        error: new Error('Callback failed'),
        event: 'auth.oauth_callback.failed'
      })
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.sentry.io/api/123/envelope/',
      expect.objectContaining({
        method: 'POST'
      })
    );

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const body = String(request?.body);
    expect(body).toContain('"event":"auth.oauth_callback.failed"');
    expect(body).toContain('"requestId":"request_1"');
    expect(body).not.toContain('secret-token');
  });
});
