import { NextRequest, NextResponse } from 'next/server';
import { TransactionType } from '@prisma/client';

import { getCurrentUser } from '../../lib/auth';
import { prisma } from '../../lib/db';
import { broadcastAppEvent } from '../../lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CreateTransactionRequest = {
  amount?: number;
  categoryId?: string;
  note?: string;
  type?: TransactionType;
};

export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getMoneySnapshot());
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
  const categoryId = String(body.categoryId ?? '');
  const amount = Number(body.amount);
  const note = String(body.note || '').trim();

  if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
    return invalidTransactionResponse(request, isJson, 'Invalid type');
  }

  if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
    return invalidTransactionResponse(request, isJson, 'Enter a valid transaction');
  }

  await prisma.transaction.create({
    data: {
      amountCents: Math.round(amount * 100),
      categoryId,
      note: note || null,
      occurredAt: new Date(),
      type
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
    type: String(formData.get('type')) as TransactionType
  };
}

function invalidTransactionResponse(request: NextRequest, isJson: boolean, message: string) {
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

async function getMoneySnapshot() {
  const [categories, transactions, totals] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.transaction.findMany({
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
      take: 12
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amountCents: true }
    })
  ]);
  const income =
    totals.find((item) => item.type === TransactionType.INCOME)?._sum
      .amountCents ?? 0;
  const expenses =
    totals.find((item) => item.type === TransactionType.EXPENSE)?._sum
      .amountCents ?? 0;

  return {
    categories: categories.map((category) => ({
      ...category,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    })),
    summary: {
      balanceCents: income - expenses,
      expensesCents: expenses,
      incomeCents: income
    },
    transactions: transactions.map((transaction) => ({
      ...transaction,
      category: {
        ...transaction.category,
        createdAt: transaction.category.createdAt.toISOString(),
        updatedAt: transaction.category.updatedAt.toISOString()
      },
      createdAt: transaction.createdAt.toISOString(),
      occurredAt: transaction.occurredAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    }))
  };
}
