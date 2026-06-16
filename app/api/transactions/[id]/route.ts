import { NextRequest, NextResponse } from 'next/server';
import { TransactionType } from '@prisma/client';

import { getCurrentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/db';
import { broadcastAppEvent } from '../../../lib/events';
import {
  centsFromAmount,
  getMoneySnapshot,
  readNumber,
  readOptionalString,
  resolveCategoryId,
  resolveWalletId
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
  const amount = body.amount === undefined ? null : readNumber(body.amount);

  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ ok: false, message: 'Invalid amount' }, { status: 400 });
  }
  if (
    body.type !== undefined &&
    body.type !== TransactionType.INCOME &&
    body.type !== TransactionType.EXPENSE
  ) {
    return NextResponse.json({ ok: false, message: 'Invalid type' }, { status: 400 });
  }
  const occurredAt = body.occurredAt === undefined ? undefined : readTransactionDate(body.occurredAt);

  if (occurredAt === null) {
    return NextResponse.json({ ok: false, message: 'Invalid date' }, { status: 400 });
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      ...(body.type !== undefined ? { type: body.type as TransactionType } : {}),
      ...(amount !== null ? { amountCents: centsFromAmount(amount) } : {}),
      ...(body.walletId !== undefined || body.walletName !== undefined
        ? { walletId: await resolveWalletId(body) }
        : {}),
      ...(body.categoryId !== undefined || body.categoryName !== undefined
        ? { categoryId: await resolveCategoryId(body) }
        : {}),
      ...(occurredAt !== undefined ? { occurredAt } : {}),
      ...(body.note !== undefined ? { note: readOptionalString(body.note)?.trim() || null } : {})
    }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'transaction.updated', transactionId: id }
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
  await prisma.transaction.delete({ where: { id } });
  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'transaction.deleted', transactionId: id }
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

function readTransactionDate(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}
