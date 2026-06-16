import { NextRequest, NextResponse } from 'next/server';

import { clearSession, markManuallyLoggedOut } from '../../../lib/auth';
import { isLocalAuthMode } from '../../../lib/env';
import { publicOrigin } from '../../../lib/request-origin';

export async function POST(request: NextRequest) {
  await clearSession();
  await markManuallyLoggedOut();

  if (isLocalAuthMode()) {
    return NextResponse.redirect(new URL('/auth/signed-out', request.url), 303);
  }

  return NextResponse.redirect(new URL('/auth/signed-out', publicOrigin()), 303);
}
