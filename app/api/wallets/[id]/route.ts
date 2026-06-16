import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/db';
import { broadcastAppEvent } from '../../../lib/events';
import {
  centsFromAmount,
  getMoneySnapshot,
  readNumber,
  readOptionalString,
  readRecordStatus,
  readRequiredString
} from '../../../lib/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const id = await readRouteId(params);
  const body = (await request.json()) as Record<string, unknown>;
  const data = {
    ...(body.name !== undefined ? { name: readRequiredString(body.name, 'name') } : {}),
    ...(body.comment !== undefined
      ? { comment: readOptionalString(body.comment)?.trim() || null }
      : {}),
    ...(body.currency !== undefined
      ? { currency: readRequiredString(body.currency, 'currency') }
      : {}),
    ...(body.color !== undefined ? { color: readRequiredString(body.color, 'color') } : {}),
    ...(body.initialBalance !== undefined
      ? { initialBalanceCents: centsFromAmount(readNumber(body.initialBalance)) }
      : {}),
    ...(body.status !== undefined ? { status: readRecordStatus(body.status) } : {})
  };

  await prisma.wallet.update({ where: { id }, data });
  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'wallet.updated', walletId: id }
  });

  return NextResponse.json(await getMoneySnapshot());
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const id = await readRouteId(params);
  const transactionCount = await prisma.transaction.count({ where: { walletId: id } });

  if (transactionCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Wallet has transactions. Change status to ARCHIVED instead, or move/delete its transactions first.'
      },
      { status: 409 }
    );
  }

  await prisma.wallet.delete({ where: { id } });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'wallet.deleted', walletId: id }
  });

  return NextResponse.json(await getMoneySnapshot());
}

async function readRouteId(params: Promise<unknown>) {
  const resolved = await params;

  if (
    !resolved ||
    typeof resolved !== 'object' ||
    !('id' in resolved) ||
    typeof resolved.id !== 'string'
  ) {
    throw new Error('id is required');
  }

  return resolved.id;
}
