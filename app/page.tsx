import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TransactionType } from '@prisma/client';

import { getCurrentUser, isManuallyLoggedOut } from './lib/auth';
import { prisma } from './lib/db';
import { checkProjectServiceHandshake } from './lib/s2s';
import { MoneyDashboard, type MoneySnapshot } from './ui/money-dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const isEmbedded = isFrameRequest(await headers());
  const [user, manuallyLoggedOut] = await Promise.all([
    getCurrentUser(),
    isManuallyLoggedOut()
  ]);

  if (!user) {
    if (manuallyLoggedOut && !isEmbedded) {
      redirect('/auth/signed-out');
    }

    redirect('/auth/login');
  }

  const [snapshot, serviceHandshake] = await Promise.all([
    getMoneySnapshot(),
    checkProjectServiceHandshake()
  ]);

  return (
    <MoneyDashboard
      displayName={user.name}
      initialServiceAvailable={serviceHandshake.ok}
      initialSnapshot={snapshot}
      isEmbedded={isEmbedded}
      role={user.role}
    />
  );
}

async function getMoneySnapshot(): Promise<MoneySnapshot> {
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

function isFrameRequest(headerStore: Headers) {
  return headerStore.get('sec-fetch-dest') === 'iframe';
}
