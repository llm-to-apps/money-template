import type {
  CategoryRecord,
  MoneySnapshot,
  TransactionRecord,
  WalletRecord
} from '@/shared/money-types';

const now = '2026-06-16T00:00:00.000Z';

export function walletFactory(
  overrides: Partial<WalletRecord> = {}
): WalletRecord {
  return {
    balanceCents: 12_000,
    color: '#059669',
    comment: null,
    createdAt: now,
    currency: 'USD',
    id: 'wallet_1',
    initialBalanceCents: 12_000,
    name: 'Main',
    status: 'ACTIVE',
    updatedAt: now,
    ...overrides
  };
}

export function categoryFactory(
  overrides: Partial<CategoryRecord> = {}
): CategoryRecord {
  return {
    color: '#2563eb',
    createdAt: now,
    id: 'category_1',
    label: 'Food',
    name: 'Food',
    parent: null,
    parentId: null,
    scope: 'EXPENSE',
    status: 'ACTIVE',
    updatedAt: now,
    ...overrides
  };
}

export function transactionFactory({
  category = categoryFactory(),
  wallet = walletFactory(),
  ...overrides
}: Partial<TransactionRecord> & {
  category?: CategoryRecord;
  wallet?: WalletRecord;
} = {}): TransactionRecord {
  return {
    amountCents: 2_400,
    category,
    categoryId: category.id,
    createdAt: now,
    id: 'transaction_1',
    note: 'Lunch',
    occurredAt: now,
    type: 'EXPENSE',
    updatedAt: now,
    wallet,
    walletId: wallet.id,
    ...overrides
  };
}

export function moneySnapshotFactory(
  overrides: Partial<MoneySnapshot> = {}
): MoneySnapshot {
  const wallet = walletFactory();
  const category = categoryFactory();
  const transaction = transactionFactory({ category, wallet });

  return {
    categories: [category],
    categoryBreakdown: [
      {
        amountCents: transaction.amountCents,
        categoryId: category.id,
        color: category.color,
        label: category.label,
        parentCategoryId: category.parentId
      }
    ],
    monthDynamics: [
      {
        balanceCents: 9_600,
        expensesCents: 2_400,
        incomeCents: 0,
        key: '2026-06',
        label: 'Jun'
      }
    ],
    summary: {
      balanceCents: 9_600,
      currentMonth: {
        balanceCents: -2_400,
        expensesCents: 2_400,
        incomeCents: 0
      },
      expensesCents: 2_400,
      incomeCents: 0,
      previousMonth: {
        balanceCents: 0,
        expensesCents: 0,
        incomeCents: 0
      }
    },
    initialTransactionsPage: {
      pageInfo: { hasNextPage: false, nextCursor: null },
      transactions: [transaction]
    },
    wallets: [wallet],
    ...overrides
  };
}
