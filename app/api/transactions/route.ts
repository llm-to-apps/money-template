import { NextRequest, NextResponse } from 'next/server';
import { TransactionType } from '@prisma/client';

import { getCurrentUser, isManuallyLoggedOut } from '../../lib/auth';
import { prisma } from '../../lib/db';
import { broadcastAppEvent } from '../../lib/events';
import {
  centsFromAmount,
  getMoneySnapshot,
  resolveCategoryId,
  resolveWalletId
} from '../../lib/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateTransactionRequest = {
  amount?: number;
  categoryId?: string;
  categoryName?: string;
  note?: string;
  occurredAt?: string;
  type?: TransactionType;
  walletId?: string;
  walletName?: string;
};

export async function GET() {
  const [user, manuallyLoggedOut] = await Promise.all([
    getCurrentUser(),
    isManuallyLoggedOut()
  ]);

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        redirectTo: manuallyLoggedOut ? '/auth/signed-out' : '/auth/login'
      },
      { status: 401 }
    );
  }

  const snapshot = await getMoneySnapshot();

  return NextResponse.json({
    ...snapshot,
    user: {
      displayName: user.name
    }
  });
}

export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return wantsJson(request)
      ? NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
      : redirectTo('/auth/login');
  }

  const isJson = wantsJson(request);
  const body = isJson
    ? ((await request.json()) as CreateTransactionRequest)
    : await readFormTransaction(request);
  const type = body.type;
  const amount = Number(body.amount);
  const note = String(body.note || '').trim();
  const occurredAt = readTransactionDate(body.occurredAt);

  if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
    return invalidTransactionResponse(isJson, 'Invalid type');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return invalidTransactionResponse(isJson, 'Enter a valid transaction');
  }

  if (!occurredAt) {
    return invalidTransactionResponse(isJson, 'Enter a valid date');
  }

  const categoryId = await resolveCategoryId(body as Record<string, unknown>).catch(() => null);
  const walletId = await resolveWalletId(body as Record<string, unknown>).catch(() => null);

  if (!categoryId || !walletId) {
    return invalidTransactionResponse(isJson, 'Enter a valid transaction');
  }

  await prisma.transaction.create({
    data: {
      amountCents: centsFromAmount(amount),
      categoryId,
      note: note || null,
      occurredAt,
      type,
      walletId
    }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'transaction.created' }
  });

  return isJson
    ? NextResponse.json(await getMoneySnapshot())
    : redirectTo('/');
}

async function readFormTransaction(request: NextRequest): Promise<CreateTransactionRequest> {
  const formData = await request.formData();

  return {
    amount: Number(formData.get('amount')),
    categoryId: String(formData.get('categoryId') ?? ''),
    note: String(formData.get('note') || ''),
    occurredAt: String(formData.get('occurredAt') || ''),
    type: String(formData.get('type')) as TransactionType,
    walletId: String(formData.get('walletId') ?? '')
  };
}

function readTransactionDate(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return new Date();
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function invalidTransactionResponse(isJson: boolean, message: string) {
  return isJson
    ? NextResponse.json({ ok: false, message }, { status: 400 })
    : redirectTo('/');
}

function wantsJson(request: NextRequest) {
  return request.headers.get('content-type')?.includes('application/json') === true;
}

function redirectTo(location: string) {
  return new NextResponse(null, {
    headers: {
      Location: location
    },
    status: 303
  });
}
