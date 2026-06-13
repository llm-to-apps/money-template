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
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as CreateTransactionRequest;
  const type = body.type;
  const categoryId = String(body.categoryId ?? '');
  const amount = Number(body.amount);
  const note = String(body.note || '').trim();

  if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
    return NextResponse.json({ ok: false, message: 'Invalid type' }, { status: 400 });
  }

  if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { ok: false, message: 'Enter a valid transaction' },
      { status: 400 }
    );
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

  return NextResponse.json(await getMoneySnapshot());
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
      createdAt: transaction.createdAt.toISOString(),
      occurredAt: transaction.occurredAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    }))
  };
}
