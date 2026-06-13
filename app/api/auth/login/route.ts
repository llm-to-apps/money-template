import { NextRequest, NextResponse } from 'next/server';

import { clearManualLogout, createLoginRedirectUrl } from '../../../lib/auth';
import { publicOrigin } from '../../../lib/request-origin';

export async function GET(request: NextRequest) {
  await clearManualLogout();
  const redirectUrl = await createLoginRedirectUrl(
    publicOrigin(),
    request.nextUrl.searchParams.get('interactive') !== '1'
  );

  return NextResponse.redirect(redirectUrl);
}
