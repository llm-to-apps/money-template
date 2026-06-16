import { NextResponse } from 'next/server';

import { dashboardPayload } from '@/server/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const result = await dashboardPayload();

  if (!result.ok) {
    return result.response;
  }

  return NextResponse.json(result.payload);
}
