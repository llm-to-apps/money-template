import 'server-only';

import { TransactionType } from '@prisma/client';

import { prisma } from '@/server/db';
import {
  type TransactionWithRelations,
  categoryLabel,
  serializeCategory,
  serializeTransaction,
  serializeWallet
} from '@/server/serializers';

export async function getMoneySnapshot() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    wallets,
    categories,
    transactions,
    totals,
    walletTotals,
    currentMonthTransactions,
    previousMonthTransactions,
    trendTransactions
  ] = await Promise.all([
    prisma.wallet.findMany({
      orderBy: [{ status: 'asc' }, { name: 'asc' }]
    }),
    prisma.category.findMany({
      include: { parent: true },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }]
    }),
    prisma.transaction.findMany({
      include: { category: { include: { parent: true } }, wallet: true },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 13
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amountCents: true }
    }),
    prisma.transaction.groupBy({
      by: ['walletId', 'type'],
      _sum: { amountCents: true }
    }),
    prisma.transaction.findMany({
      include: { category: { include: { parent: true } }, wallet: true },
      where: { occurredAt: { gte: monthStart } }
    }),
    prisma.transaction.findMany({
      where: {
        occurredAt: {
          gte: previousMonthStart,
          lt: monthStart
        }
      }
    }),
    prisma.transaction.findMany({
      where: { occurredAt: { gte: trendStart } },
      orderBy: { occurredAt: 'asc' }
    })
  ]);

  const summary = summarizeTransactions(totals);
  const currentMonthSummary = summarizeTransactionRows(
    currentMonthTransactions
  );
  const previousMonthSummary = summarizeTransactionRows(
    previousMonthTransactions
  );
  const walletBalanceById = new Map<string, number>();

  for (const wallet of wallets) {
    walletBalanceById.set(wallet.id, wallet.initialBalanceCents);
  }
  for (const total of walletTotals) {
    const current = walletBalanceById.get(total.walletId) ?? 0;
    const amount = total._sum.amountCents ?? 0;

    walletBalanceById.set(
      total.walletId,
      current + (total.type === TransactionType.INCOME ? amount : -amount)
    );
  }

  const initialTransactions = transactions.slice(0, 12);
  const hasNextTransactionsPage = transactions.length > 12;

  return {
    categories: categories.map(serializeCategory),
    categoryBreakdown: buildCategoryBreakdown(currentMonthTransactions),
    initialTransactionsPage: {
      pageInfo: {
        hasNextPage: hasNextTransactionsPage,
        nextCursor: hasNextTransactionsPage
          ? (initialTransactions.at(-1)?.id ?? null)
          : null
      },
      transactions: initialTransactions.map(serializeTransaction)
    },
    monthDynamics: buildMonthDynamics(trendTransactions, trendStart, now),
    summary: {
      ...summary,
      currentMonth: currentMonthSummary,
      previousMonth: previousMonthSummary
    },
    wallets: wallets.map((wallet) => ({
      ...serializeWallet(wallet),
      balanceCents:
        walletBalanceById.get(wallet.id) ?? wallet.initialBalanceCents
    }))
  };
}

function summarizeTransactions(
  totals: Array<{
    type: TransactionType;
    _sum: { amountCents: number | null };
  }>
) {
  const income =
    totals.find((item) => item.type === TransactionType.INCOME)?._sum
      .amountCents ?? 0;
  const expenses =
    totals.find((item) => item.type === TransactionType.EXPENSE)?._sum
      .amountCents ?? 0;

  return {
    balanceCents: income - expenses,
    expensesCents: expenses,
    incomeCents: income
  };
}

function summarizeTransactionRows(
  rows: Array<{ amountCents: number; type: TransactionType }>
) {
  const income = rows
    .filter((item) => item.type === TransactionType.INCOME)
    .reduce((total, item) => total + item.amountCents, 0);
  const expenses = rows
    .filter((item) => item.type === TransactionType.EXPENSE)
    .reduce((total, item) => total + item.amountCents, 0);

  return {
    balanceCents: income - expenses,
    expensesCents: expenses,
    incomeCents: income
  };
}

function buildCategoryBreakdown(transactions: TransactionWithRelations[]) {
  const byCategory = new Map<
    string,
    {
      amountCents: number;
      categoryId: string;
      color: string;
      label: string;
      parentCategoryId: string | null;
    }
  >();

  for (const transaction of transactions) {
    if (transaction.type !== TransactionType.EXPENSE) {
      continue;
    }

    const current = byCategory.get(transaction.categoryId) ?? {
      amountCents: 0,
      categoryId: transaction.categoryId,
      color: transaction.category.color,
      label: categoryLabel(transaction.category),
      parentCategoryId: transaction.category.parentId
    };

    current.amountCents += transaction.amountCents;
    byCategory.set(transaction.categoryId, current);
  }

  return Array.from(byCategory.values()).sort(
    (left, right) => right.amountCents - left.amountCents
  );
}

function buildMonthDynamics(
  transactions: Array<{
    amountCents: number;
    occurredAt: Date;
    type: TransactionType;
  }>,
  start: Date,
  end: Date
) {
  const months: Array<{
    balanceCents: number;
    expensesCents: number;
    incomeCents: number;
    key: string;
    label: string;
  }> = [];

  for (
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    cursor <= end;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    months.push({
      balanceCents: 0,
      expensesCents: 0,
      incomeCents: 0,
      key: monthKey(cursor),
      label: cursor.toLocaleDateString('en-US', { month: 'short' })
    });
  }

  const byKey = new Map(months.map((month) => [month.key, month]));

  for (const transaction of transactions) {
    const month = byKey.get(monthKey(transaction.occurredAt));

    if (!month) {
      continue;
    }

    if (transaction.type === TransactionType.INCOME) {
      month.incomeCents += transaction.amountCents;
      month.balanceCents += transaction.amountCents;
    } else {
      month.expensesCents += transaction.amountCents;
      month.balanceCents -= transaction.amountCents;
    }
  }

  return months;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
