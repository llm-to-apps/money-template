import { NextRequest, NextResponse } from 'next/server';

import { clearManualLogout, createOAuthRequest } from '@/server/auth';
import { isLocalAuthMode } from '@/server/env';
import { logInfo } from '@/server/logger';
import { renderOAuthLoginPage } from '@/server/oauth-login-page';
import { publicOrigin } from '@/server/request-origin';

export async function GET(request: NextRequest) {
  if (isLocalAuthMode()) {
    await clearManualLogout();

    return NextResponse.redirect(new URL('/', request.url));
  }

  const origin = await publicOrigin();
  const oauthRequest = await createOAuthRequest(origin);
  logInfo('auth.oauth_login_bridge.rendered', {
    clientId: oauthRequest.clientId,
    isFrameHint: request.headers.get('sec-fetch-dest') === 'iframe',
    origin,
    provider: 'os7',
    redirectUri: oauthRequest.redirectUri
  });

  return new NextResponse(renderOAuthLoginPage(oauthRequest), {
    headers: {
      'content-type': 'text/html; charset=utf-8'
    }
  });
}
