import { NextRequest, NextResponse } from 'next/server';

import { handleOAuthCallback } from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';
import { logError, logInfo, logWarn } from '@/server/logger';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: NextRequest) {
  if (isLocalAuthMode()) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const origin = publicOrigin();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');
  logInfo('[Money OAuth Callback] request', {
    codePresent: Boolean(code),
    error,
    origin,
    state
  });

  if (error) {
    logWarn('[Money OAuth Callback] provider returned error', {
      error,
      origin
    });
    return NextResponse.redirect(
      new URL(`/api/auth/login?interactive=1&error=${error}`, origin)
    );
  }

  if (!code || !state) {
    logWarn('[Money OAuth Callback] invalid callback params', {
      codePresent: Boolean(code),
      origin,
      state
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
    logInfo('[Money OAuth Callback] completed', { origin, state });
  } catch (error) {
    logError('Money OAuth callback failed', {
      error: error instanceof Error ? error.message : String(error),
      origin,
      state
    });

    return NextResponse.redirect(
      new URL('/api/auth/login?interactive=1&error=callback_failed', origin)
    );
  }

  return NextResponse.redirect(new URL('/', origin));
}
