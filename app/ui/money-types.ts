export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecordStatus = 'ACTIVE' | 'ARCHIVED';
export type MoneyView = 'categories' | 'dashboard' | 'transactions' | 'wallets';

export type MoneyRouteMode =
  | { action: 'list' }
  | { action: 'new' }
  | { action: 'edit'; id: string };

export type CategoryScope = 'INCOME' | 'EXPENSE' | 'BOTH';

export type CategoryRecord = {
  color: string;
  createdAt: Date | string;
  id: string;
  status: RecordStatus;
  label: string;
  name: string;
  parent: CategoryRecord | null;
  parentId: string | null;
  scope: CategoryScope;
  updatedAt: Date | string;
};

export type WalletRecord = {
  balanceCents: number;
  color: string;
  comment: string | null;
  createdAt: Date | string;
  currency: string;
  id: string;
  initialBalanceCents: number;
  status: RecordStatus;
  name: string;
  updatedAt: Date | string;
};

export type TransactionRecord = {
  amountCents: number;
  category: CategoryRecord;
  categoryId: string;
  createdAt: Date | string;
  id: string;
  note: string | null;
  occurredAt: Date | string;
  type: TransactionType;
  updatedAt: Date | string;
  wallet: WalletRecord;
  walletId: string;
};

export type MoneySnapshot = {
  categories: CategoryRecord[];
  categoryBreakdown: Array<{
    amountCents: number;
    categoryId: string;
    color: string;
    label: string;
    parentCategoryId: string | null;
  }>;
  monthDynamics: Array<{
    balanceCents: number;
    expensesCents: number;
    incomeCents: number;
    key: string;
    label: string;
  }>;
  summary: {
    balanceCents: number;
    currentMonth: {
      balanceCents: number;
      expensesCents: number;
      incomeCents: number;
    };
    expensesCents: number;
    incomeCents: number;
    previousMonth: {
      balanceCents: number;
      expensesCents: number;
      incomeCents: number;
    };
  };
  transactions: TransactionRecord[];
  wallets: WalletRecord[];
};

export type MoneyDashboardPayload = MoneySnapshot & {
  user: {
    displayName: string | null;
  };
};

export type AuthErrorPayload = {
  redirectTo?: string;
};

export type MoneyUser = {
  displayName: string | null;
};

export type MoneyDashboardProps = {
  initialIsEmbedded: boolean;
  initialUser: MoneyUser;
};
