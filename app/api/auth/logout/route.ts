import { NextRequest, NextResponse } from 'next/server';

import { clearSession, markManuallyLoggedOut } from '../../../lib/auth';
import { publicOrigin } from '../../../lib/request-origin';

export async function POST(request: NextRequest) {
  await clearSession();
  await markManuallyLoggedOut();

  return NextResponse.redirect(new URL('/auth/signed-out', publicOrigin()), 303);
}
