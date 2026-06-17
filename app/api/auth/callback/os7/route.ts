import { NextRequest, NextResponse } from 'next/server';

import { handleOAuthCallback } from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';
import { logError, logInfo, logWarn } from '@/server/logger';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: NextRequest) {
  if (isLocalAuthMode()) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const origin = await publicOrigin();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');
  const startedAt = Date.now();
  logInfo('auth.oauth_callback.received', {
    codePresent: Boolean(code),
    origin,
    provider: 'os7',
    statePresent: Boolean(state),
    status: error ? 'provider_error' : 'received'
  });

  if (error) {
    logWarn('auth.oauth_callback.provider_error', {
      elapsedMs: Date.now() - startedAt,
      error,
      origin,
      provider: 'os7'
    });
    return NextResponse.redirect(
      new URL(`/api/auth/login?interactive=1&error=${error}`, origin)
    );
  }

  if (!code || !state) {
    logWarn('auth.oauth_callback.invalid_params', {
      codePresent: Boolean(code),
      elapsedMs: Date.now() - startedAt,
      origin,
      provider: 'os7',
      statePresent: Boolean(state)
    });
    return NextResponse.redirect(
      new URL('/api/auth/login?error=invalid_callback', origin)
    );
  }

  try {
    await handleOAuthCallback({
      code,
      origin,
      state
    });
    logInfo('auth.oauth_callback.finished', {
      elapsedMs: Date.now() - startedAt,
      origin,
      provider: 'os7'
    });
  } catch (error) {
    logError('auth.oauth_callback.failed', {
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      origin,
      provider: 'os7'
    });

    return NextResponse.redirect(
      new URL('/api/auth/login?interactive=1&error=callback_failed', origin)
    );
  }

  return NextResponse.redirect(new URL('/', origin));
}
