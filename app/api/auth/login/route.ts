import { NextRequest, NextResponse } from 'next/server';

import { clearManualLogout, createLoginRedirectUrl } from '../../../lib/auth';
import { isLocalAuthMode } from '../../../lib/env';
import { publicOrigin } from '../../../lib/request-origin';

export async function GET(request: NextRequest) {
  await clearManualLogout();

  if (isLocalAuthMode()) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const redirectUrl = await createLoginRedirectUrl(
    publicOrigin(),
    request.nextUrl.searchParams.get('interactive') !== '1'
  );

  return NextResponse.redirect(redirectUrl);
}
