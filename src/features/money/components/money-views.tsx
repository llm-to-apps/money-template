'use client';

import { FormEvent } from 'react';

export { ActionErrorModal } from '@/features/money/components/action-error-modal';
export { UserMenu } from '@/features/money/components/user-menu';

import { CategoriesRouteView } from '@/features/money/components/categories-route-view';
import { DashboardPanels } from '@/features/money/components/dashboard-panels';
import { TransactionsRouteView } from '@/features/money/components/transactions-route-view';
import { WalletsRouteView } from '@/features/money/components/wallets-route-view';
import type {
  MoneyRouteMode,
  MoneySnapshot,
  MoneyView
} from '@/shared/money-types';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;

export function RouteView({
  defaultCategoryId,
  defaultWalletId,
  isManaging,
  isPending,
  isSaving,
  onCreateCategory,
  onCreateTransaction,
  onCreateWallet,
  onDeleteCategory,
  onDeleteTransaction,
  onDeleteWallet,
  onUpdateCategory,
  onUpdateTransaction,
  onUpdateWallet,
  routeMode,
  snapshot,
  view
}: {
  defaultCategoryId: string;
  defaultWalletId: string;
  isManaging: boolean;
  isPending: boolean;
  isSaving: boolean;
  onCreateCategory: MutationFormHandler;
  onCreateTransaction: MutationFormHandler;
  onCreateWallet: MutationFormHandler;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onDeleteWallet: (walletId: string) => void;
  onUpdateCategory: (
    event: FormEvent<HTMLFormElement>,
    categoryId: string
  ) => void;
  onUpdateTransaction: (
    event: FormEvent<HTMLFormElement>,
    transactionId: string
  ) => void;
  onUpdateWallet: (event: FormEvent<HTMLFormElement>, walletId: string) => void;
  routeMode: MoneyRouteMode;
  snapshot: MoneySnapshot;
  view: MoneyView;
}) {
  if (view === 'transactions') {
    return (
      <TransactionsRouteView
        defaultCategoryId={defaultCategoryId}
        defaultWalletId={defaultWalletId}
        isManaging={isManaging}
        isPending={isPending}
        isSaving={isSaving}
        onCreateTransaction={onCreateTransaction}
        onDeleteTransaction={onDeleteTransaction}
        onUpdateTransaction={onUpdateTransaction}
        routeMode={routeMode}
        snapshot={snapshot}
      />
    );
  }

  if (view === 'wallets') {
    return (
      <WalletsRouteView
        isManaging={isManaging}
        onCreateWallet={onCreateWallet}
        onDeleteWallet={onDeleteWallet}
        onUpdateWallet={onUpdateWallet}
        routeMode={routeMode}
        snapshot={snapshot}
      />
    );
  }

  if (view === 'categories') {
    return (
      <CategoriesRouteView
        isManaging={isManaging}
        onCreateCategory={onCreateCategory}
        onDeleteCategory={onDeleteCategory}
        onUpdateCategory={onUpdateCategory}
        routeMode={routeMode}
        snapshot={snapshot}
      />
    );
  }

  return <DashboardPanels snapshot={snapshot} />;
}
