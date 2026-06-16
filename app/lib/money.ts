import {
  CategoryScope,
  Prisma,
  RecordStatus,
  TransactionType
} from '@prisma/client';

import { prisma } from './db';

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: { include: { parent: true } };
    wallet: true;
  };
}>;

type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: { parent: true };
}>;

export function centsFromAmount(amount: number) {
  return Math.round(amount * 100);
}

export function serializeWallet(wallet: Prisma.WalletGetPayload<object>) {
  return {
    ...wallet,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString()
  };
}

export function serializeCategory(category: CategoryWithParent) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    label: categoryLabel(category),
    parent: category.parent
      ? {
          ...category.parent,
          createdAt: category.parent.createdAt.toISOString(),
          updatedAt: category.parent.updatedAt.toISOString()
        }
      : null,
    updatedAt: category.updatedAt.toISOString()
  };
}

export function serializeTransaction(transaction: TransactionWithRelations) {
  return {
    ...transaction,
    category: serializeCategory(transaction.category),
    createdAt: transaction.createdAt.toISOString(),
    occurredAt: transaction.occurredAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    wallet: serializeWallet(transaction.wallet)
  };
}

export function categoryLabel(category: {
  name: string;
  parent?: { name: string } | null;
}) {
  return category.parent ? `${category.parent.name} / ${category.name}` : category.name;
}

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
      orderBy: { occurredAt: 'desc' },
      take: 12
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
  const currentMonthSummary = summarizeTransactionRows(currentMonthTransactions);
  const previousMonthSummary = summarizeTransactionRows(previousMonthTransactions);
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

  return {
    categories: categories.map(serializeCategory),
    categoryBreakdown: buildCategoryBreakdown(currentMonthTransactions),
    monthDynamics: buildMonthDynamics(trendTransactions, trendStart, now),
    summary: {
      ...summary,
      currentMonth: currentMonthSummary,
      previousMonth: previousMonthSummary
    },
    transactions: transactions.map(serializeTransaction),
    wallets: wallets.map((wallet) => ({
      ...serializeWallet(wallet),
      balanceCents: walletBalanceById.get(wallet.id) ?? wallet.initialBalanceCents
    }))
  };
}

export async function resolveWalletId(args: Record<string, unknown>) {
  const walletId = readOptionalString(args.walletId);

  if (walletId) {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });

    if (!wallet) {
      throw new Error('walletId does not exist');
    }

    return wallet.id;
  }

  const walletName = readOptionalString(args.walletName)?.trim();

  if (walletName) {
    const wallet = await prisma.wallet.upsert({
      where: { name: walletName },
      update: { status: RecordStatus.ACTIVE },
      create: { name: walletName }
    });

    return wallet.id;
  }

  return getDefaultWalletId();
}

export async function getDefaultWalletId() {
  const existing = await prisma.wallet.findFirst({
    where: { status: RecordStatus.ACTIVE },
    orderBy: { createdAt: 'asc' }
  });

  if (existing) {
    return existing.id;
  }

  const wallet = await prisma.wallet.create({
    data: {
      name: 'Main Card',
      color: '#059669'
    }
  });

  return wallet.id;
}

export async function resolveCategoryId(args: Record<string, unknown>) {
  const categoryId = readOptionalString(args.categoryId);

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });

    if (!category) {
      throw new Error('categoryId does not exist');
    }

    return category.id;
  }

  const categoryName = readOptionalString(args.categoryName)?.trim();

  if (!categoryName) {
    throw new Error('categoryId or categoryName is required');
  }

  return upsertCategoryPath(categoryName, {
    color: readOptionalString(args.categoryColor)?.trim() || undefined,
    scope: readOptionalCategoryScope(args.scope)
  });
}

export async function upsertCategoryPath(
  categoryPath: string,
  options: { color?: string; scope?: CategoryScope | null; parentId?: string | null } = {}
) {
  const parts = categoryPath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('category name is required');
  }

  let parentId = options.parentId ?? null;
  let categoryId = '';

  for (const [index, name] of parts.entries()) {
    const isLeaf = index === parts.length - 1;
    const existing = await prisma.category.findFirst({
      where: { name, parentId },
      orderBy: { createdAt: 'asc' }
    });

    const data = {
      ...(isLeaf && options.color ? { color: options.color } : {}),
      ...(isLeaf && options.scope ? { scope: options.scope } : {})
    };
    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { ...data, status: RecordStatus.ACTIVE }
        })
      : await prisma.category.create({
          data: {
            name,
            parentId,
            color: options.color ?? '#059669',
            scope: isLeaf ? options.scope ?? CategoryScope.BOTH : CategoryScope.BOTH
          }
        });

    categoryId = category.id;
    parentId = category.id;
  }

  return categoryId;
}

export async function buildTransactionWhere(args: Record<string, unknown>) {
  const type = args.type === undefined ? null : readTransactionType(args.type);
  const walletId =
    args.walletId !== undefined || args.walletName !== undefined
      ? await resolveWalletId(args)
      : null;
  const categoryId =
    args.categoryId !== undefined || args.categoryName !== undefined
      ? await resolveCategoryId(args)
      : null;
  const parentCategoryName = readOptionalString(args.parentCategoryName)?.trim();
  const parentCategoryId = readOptionalString(args.parentCategoryId)?.trim();
  const from = readOptionalDate(args.from, 'from');
  const to = readOptionalDate(args.to, 'to');
  const minAmount = readOptionalPositiveAmount(args.minAmount, 'minAmount');
  const maxAmount = readOptionalPositiveAmount(args.maxAmount, 'maxAmount');
  const query = readOptionalString(args.query)?.trim();

  if (from && to && from.getTime() > to.getTime()) {
    throw new Error('from must be before to');
  }
  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    throw new Error('minAmount must be less than or equal to maxAmount');
  }

  return {
    ...(type ? { type } : {}),
    ...(walletId ? { walletId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(parentCategoryId || parentCategoryName
      ? {
          category: {
            parent: {
              ...(parentCategoryId ? { id: parentCategoryId } : {}),
              ...(parentCategoryName ? { name: { contains: parentCategoryName } } : {})
            }
          }
        }
      : {}),
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {}),
    ...(minAmount !== null || maxAmount !== null
      ? {
          amountCents: {
            ...(minAmount !== null ? { gte: centsFromAmount(minAmount) } : {}),
            ...(maxAmount !== null ? { lte: centsFromAmount(maxAmount) } : {})
          }
        }
      : {}),
    ...(query
      ? {
          OR: [
            { note: { contains: query } },
            { category: { name: { contains: query } } },
            { category: { parent: { name: { contains: query } } } },
            { wallet: { name: { contains: query } } }
          ]
        }
      : {})
  } satisfies Prisma.TransactionWhereInput;
}

export function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function readRequiredString(value: unknown, name: string) {
  const text = readString(value).trim();

  if (!text) {
    throw new Error(`${name} is required`);
  }

  return text;
}

export function readOptionalString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

export function readNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value);
}

export function readOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return readNumber(value);
}

export function readOptionalDate(value: unknown, name: string) {
  const dateValue = readOptionalString(value);

  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} must be a valid date string`);
  }

  return date;
}

export function readOptionalPositiveAmount(value: unknown, name: string) {
  const amount = readOptionalNumber(value);

  if (amount === null) {
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return amount;
}

export function readTransactionType(value: unknown) {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) {
    return value;
  }

  throw new Error('type must be INCOME or EXPENSE');
}

export function readOptionalCategoryScope(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (
    value === CategoryScope.INCOME ||
    value === CategoryScope.EXPENSE ||
    value === CategoryScope.BOTH
  ) {
    return value;
  }

  throw new Error('scope must be INCOME, EXPENSE, or BOTH');
}

export function readRecordStatus(value: unknown) {
  if (value === RecordStatus.ACTIVE || value === RecordStatus.ARCHIVED) {
    return value;
  }

  throw new Error('status must be ACTIVE or ARCHIVED');
}

function summarizeTransactions(
  totals: Array<{
    type: TransactionType;
    _sum: { amountCents: number | null };
  }>
) {
  const income =
    totals.find((item) => item.type === TransactionType.INCOME)?._sum.amountCents ?? 0;
  const expenses =
    totals.find((item) => item.type === TransactionType.EXPENSE)?._sum.amountCents ?? 0;

  return {
    balanceCents: income - expenses,
    expensesCents: expenses,
    incomeCents: income
  };
}

function summarizeTransactionRows(rows: Array<{ amountCents: number; type: TransactionType }>) {
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
  transactions: Array<{ amountCents: number; occurredAt: Date; type: TransactionType }>,
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
