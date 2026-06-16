import { NextRequest, NextResponse } from 'next/server';

import { handleOAuthCallback } from '../../../../lib/auth';
import { isLocalAuthMode } from '../../../../lib/env';
import { publicOrigin } from '../../../../lib/request-origin';

export async function GET(request: NextRequest) {
  if (isLocalAuthMode()) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const origin = publicOrigin();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');
  console.info('[Money OAuth Callback] request', {
    codePresent: Boolean(code),
    error,
    origin,
    state
  });

  if (error) {
    console.warn('[Money OAuth Callback] provider returned error', { error, origin });
    return NextResponse.redirect(
      new URL(`/api/auth/login?interactive=1&error=${error}`, origin)
    );
  }

  if (!code || !state) {
    console.warn('[Money OAuth Callback] invalid callback params', {
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
    console.info('[Money OAuth Callback] completed', { origin, state });
  } catch (error) {
    console.error('Money OAuth callback failed', error);

    return NextResponse.redirect(
      new URL('/api/auth/login?interactive=1&error=callback_failed', origin)
    );
  }

  return NextResponse.redirect(new URL('/', origin));
}
