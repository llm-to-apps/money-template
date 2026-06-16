import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '../../lib/auth';
import { prisma } from '../../lib/db';
import { broadcastAppEvent } from '../../lib/events';
import {
  centsFromAmount,
  getMoneySnapshot,
  readOptionalNumber,
  readOptionalString,
  readRequiredString
} from '../../lib/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const name = readRequiredString(body.name, 'name');
  const wallet = await prisma.wallet.create({
    data: {
      name,
      color: readOptionalString(body.color)?.trim() || '#059669',
      comment: readOptionalString(body.comment)?.trim() || null,
      currency: readOptionalString(body.currency)?.trim() || 'USD',
      initialBalanceCents: centsFromAmount(readOptionalNumber(body.initialBalance) ?? 0)
    }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'wallet.created', walletId: wallet.id }
  });

  return NextResponse.json(await getMoneySnapshot());
}
