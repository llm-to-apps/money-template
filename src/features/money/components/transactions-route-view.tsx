'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@mantine/core';

import { FormSkeleton } from '@/features/money/components/loading-skeletons';
import {
  AddTransactionForm,
  TransactionForm,
  TransactionsList
} from '@/features/money/components/transactions-view';
import {
  homeCrumb,
  isActive,
  MoneyBreadcrumbs,
  ViewStack
} from '@/features/money/components/view-primitives';
import type {
  MoneyRouteMode,
  MoneySnapshot,
  TransactionRecord
} from '@/shared/money-types';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;

export function TransactionsRouteView({
  defaultCategoryId,
  defaultWalletId,
  isManaging,
  isPending,
  isSaving,
  onCreateTransaction,
  onDeleteTransaction,
  onUpdateTransaction,
  routeMode,
  snapshot
}: {
  defaultCategoryId: string;
  defaultWalletId: string;
  isManaging: boolean;
  isPending: boolean;
  isSaving: boolean;
  onCreateTransaction: MutationFormHandler;
  onDeleteTransaction: (transactionId: string) => void;
  onUpdateTransaction: (
    event: FormEvent<HTMLFormElement>,
    transactionId: string
  ) => void;
  routeMode: MoneyRouteMode;
  snapshot: MoneySnapshot;
}) {
  if (routeMode.action === 'new') {
    return (
      <ViewStack>
        <MoneyBreadcrumbs
          items={[
            homeCrumb,
            { href: '/transactions', label: 'Transactions' },
            { label: 'Add' }
          ]}
        />
        <AddTransactionForm
          categories={snapshot.categories.filter(isActive)}
          defaultCategoryId={defaultCategoryId}
          defaultWalletId={defaultWalletId}
          isPending={isPending}
          isSaving={isSaving}
          onSubmit={onCreateTransaction}
          wallets={snapshot.wallets.filter(isActive)}
        />
      </ViewStack>
    );
  }

  if (routeMode.action === 'edit') {
    const transaction = snapshot.initialTransactionsPage.transactions.find(
      (item) => item.id === routeMode.id
    );

    return (
      <TransactionEditView
        categories={snapshot.categories}
        initialTransaction={transaction}
        isManaging={isManaging}
        onDeleteTransaction={onDeleteTransaction}
        onUpdateTransaction={onUpdateTransaction}
        transactionId={routeMode.id}
        wallets={snapshot.wallets}
      />
    );
  }

  return (
    <ViewStack>
      <MoneyBreadcrumbs items={[homeCrumb, { label: 'Transactions' }]} />
      <TransactionsList snapshot={snapshot} />
    </ViewStack>
  );
}

function TransactionEditView({
  categories,
  initialTransaction,
  isManaging,
  onDeleteTransaction,
  onUpdateTransaction,
  transactionId,
  wallets
}: {
  categories: MoneySnapshot['categories'];
  initialTransaction: TransactionRecord | undefined;
  isManaging: boolean;
  onDeleteTransaction: (transactionId: string) => void;
  onUpdateTransaction: (
    event: FormEvent<HTMLFormElement>,
    transactionId: string
  ) => void;
  transactionId: string;
  wallets: MoneySnapshot['wallets'];
}) {
  const [transaction, setTransaction] = useState<TransactionRecord | null>(
    initialTransaction ?? null
  );
  const [status, setStatus] = useState<'error' | 'idle' | 'loading'>(
    initialTransaction ? 'idle' : 'loading'
  );

  useEffect(() => {
    setTransaction(initialTransaction ?? null);
    setStatus(initialTransaction ? 'idle' : 'loading');

    if (initialTransaction) {
      return;
    }

    let isCurrent = true;

    async function loadTransaction() {
      try {
        const response = await fetch(`/api/transactions/${transactionId}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('transaction not found');
        }

        const payload = (await response.json()) as {
          transaction: TransactionRecord;
        };

        if (isCurrent) {
          setTransaction(payload.transaction);
          setStatus('idle');
        }
      } catch {
        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    void loadTransaction();

    return () => {
      isCurrent = false;
    };
  }, [initialTransaction, transactionId]);

  return (
    <ViewStack>
      <MoneyBreadcrumbs
        items={[
          homeCrumb,
          { href: '/transactions', label: 'Transactions' },
          { label: transaction?.category.label ?? 'Edit' }
        ]}
      />
      {transaction ? (
        <TransactionForm
          categories={categories}
          isManaging={isManaging}
          onDeleteTransaction={onDeleteTransaction}
          onSubmit={(event) => onUpdateTransaction(event, transaction.id)}
          transaction={transaction}
          wallets={wallets}
        />
      ) : status === 'error' ? (
        <Card withBorder>Transaction not found.</Card>
      ) : (
        <FormSkeleton />
      )}
    </ViewStack>
  );
}
