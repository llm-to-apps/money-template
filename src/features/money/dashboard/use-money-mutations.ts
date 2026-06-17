'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useMemo,
  useRef,
  useState,
  useTransition
} from 'react';

import type {
  MoneySnapshot,
  TransactionRecord,
  TransactionType
} from '@/shared/money-types';
import { formatDateInputValue, waitForUiDelay } from '@/shared/money-utils';
import type { ApiResponse } from '@/shared/api';

export function useMoneyMutations({
  loadSnapshot,
  router,
  setError,
  setSnapshot,
  snapshot
}: {
  loadSnapshot: () => Promise<void>;
  router: AppRouterInstance;
  setError: Dispatch<SetStateAction<string | null>>;
  setSnapshot: Dispatch<SetStateAction<MoneySnapshot | null>>;
  snapshot: MoneySnapshot | null;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const optimisticId = useRef(0);
  const categoryById = useMemo(
    () =>
      new Map(
        (snapshot?.categories ?? []).map((category) => [category.id, category])
      ),
    [snapshot?.categories]
  );

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setError(null);

    if (!snapshot) {
      setError('Transactions are still loading.');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = String(formData.get('type')) as TransactionType;
    const categoryId = String(formData.get('categoryId') ?? '');
    const walletId = String(formData.get('walletId') ?? '');
    const amount = Number(formData.get('amount'));
    const note = String(formData.get('note') || '').trim();
    const occurredAtValue = String(formData.get('occurredAt') || '');
    const occurredAt = new Date(`${occurredAtValue}T12:00:00`);
    const category = categoryById.get(categoryId);
    const wallet = snapshot.wallets.find((item) => item.id === walletId);

    if (
      !category ||
      !wallet ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Number.isNaN(occurredAt.getTime())
    ) {
      setError('Enter a valid transaction.');
      return;
    }

    setIsSaving(true);
    try {
      await waitForUiDelay();

      const now = new Date().toISOString();
      const optimisticAmountCents = Math.round(amount * 100);
      optimisticId.current += 1;
      const optimisticTransaction: TransactionRecord = {
        amountCents: optimisticAmountCents,
        category,
        categoryId,
        createdAt: now,
        id: `optimistic-${optimisticId.current}`,
        note: note || null,
        occurredAt: occurredAt.toISOString(),
        type,
        updatedAt: now,
        wallet,
        walletId
      };

      startTransition(() => {
        setSnapshot((current) => {
          if (!current) {
            return current;
          }

          const optimisticTransactions = [
            optimisticTransaction,
            ...current.initialTransactionsPage.transactions
          ].slice(0, 12);

          return {
            ...current,
            summary: {
              balanceCents:
                current.summary.balanceCents +
                (type === 'INCOME'
                  ? optimisticAmountCents
                  : -optimisticAmountCents),
              currentMonth: {
                balanceCents:
                  current.summary.currentMonth.balanceCents +
                  (type === 'INCOME'
                    ? optimisticAmountCents
                    : -optimisticAmountCents),
                expensesCents:
                  current.summary.currentMonth.expensesCents +
                  (type === 'EXPENSE' ? optimisticAmountCents : 0),
                incomeCents:
                  current.summary.currentMonth.incomeCents +
                  (type === 'INCOME' ? optimisticAmountCents : 0)
              },
              expensesCents:
                current.summary.expensesCents +
                (type === 'EXPENSE' ? optimisticAmountCents : 0),
              incomeCents:
                current.summary.incomeCents +
                (type === 'INCOME' ? optimisticAmountCents : 0),
              previousMonth: current.summary.previousMonth
            },
            initialTransactionsPage: {
              pageInfo: {
                hasNextPage:
                  current.initialTransactionsPage.pageInfo.hasNextPage,
                nextCursor: current.initialTransactionsPage.pageInfo.hasNextPage
                  ? (optimisticTransactions.at(-1)?.id ?? null)
                  : null
              },
              transactions: optimisticTransactions
            },
            wallets: current.wallets.map((currentWallet) =>
              currentWallet.id === walletId
                ? {
                    ...currentWallet,
                    balanceCents:
                      currentWallet.balanceCents +
                      (type === 'INCOME'
                        ? optimisticAmountCents
                        : -optimisticAmountCents)
                  }
                : currentWallet
            )
          };
        });
      });
      form.reset();

      const response = await fetch('/api/transactions', {
        body: JSON.stringify({
          amount,
          categoryId,
          note,
          occurredAt: formatDateInputValue(occurredAt),
          type,
          walletId
        }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });

      if (!response.ok) {
        setError('Could not save transaction.');
        await loadSnapshot();
        return;
      }

      const payload = (await response.json()) as ApiResponse<MoneySnapshot>;

      if (!payload.ok) {
        setError(payload.error.message);
        await loadSnapshot();
        return;
      }

      const nextSnapshot = payload.data;
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
      router.push('/transactions');
    } catch {
      setError('Could not save transaction.');
      await loadSnapshot();
    } finally {
      setIsSaving(false);
    }
  }

  async function runJsonMutation(path: string, init: RequestInit) {
    setError(null);
    setIsManaging(true);
    try {
      await waitForUiDelay();

      const response = await fetch(path, {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init.headers ?? {})
        }
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: {
            message?: string;
          };
        } | null;
        setError(payload?.error?.message ?? 'Could not save changes.');
        return false;
      }

      const payload = (await response.json()) as ApiResponse<MoneySnapshot>;

      if (!payload.ok) {
        setError(payload.error.message);
        return false;
      }

      const nextSnapshot = payload.data;
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
      return true;
    } catch {
      setError('Could not save changes.');
      await loadSnapshot();
      return false;
    } finally {
      setIsManaging(false);
    }
  }

  async function createWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const ok = await runJsonMutation('/api/wallets', {
      body: JSON.stringify(Object.fromEntries(formData)),
      method: 'POST'
    });
    if (ok) {
      form.reset();
      router.push('/wallets');
    }
  }

  async function updateWallet(
    event: FormEvent<HTMLFormElement>,
    walletId: string
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue> =
      Object.fromEntries(formData);

    const ok = await runJsonMutation(`/api/wallets/${walletId}`, {
      body: JSON.stringify(payload),
      method: 'PATCH'
    });
    if (ok) {
      router.push('/wallets');
    }
  }

  async function deleteWallet(walletId: string) {
    const ok = await runJsonMutation(`/api/wallets/${walletId}`, {
      method: 'DELETE'
    });
    if (ok) {
      router.push('/wallets');
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const ok = await runJsonMutation('/api/categories', {
      body: JSON.stringify(Object.fromEntries(formData)),
      method: 'POST'
    });
    if (ok) {
      form.reset();
      router.push('/categories');
    }
  }

  async function updateCategory(
    event: FormEvent<HTMLFormElement>,
    categoryId: string
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue> =
      Object.fromEntries(formData);

    const ok = await runJsonMutation(`/api/categories/${categoryId}`, {
      body: JSON.stringify(payload),
      method: 'PATCH'
    });
    if (ok) {
      router.push('/categories');
    }
  }

  async function deleteCategory(categoryId: string) {
    const ok = await runJsonMutation(`/api/categories/${categoryId}`, {
      method: 'DELETE'
    });
    if (ok) {
      router.push('/categories');
    }
  }

  async function updateTransaction(
    event: FormEvent<HTMLFormElement>,
    transactionId: string
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const ok = await runJsonMutation(`/api/transactions/${transactionId}`, {
      body: JSON.stringify(Object.fromEntries(formData)),
      method: 'PATCH'
    });
    if (ok) {
      router.push('/transactions');
    }
  }

  async function deleteTransaction(transactionId: string) {
    const ok = await runJsonMutation(`/api/transactions/${transactionId}`, {
      method: 'DELETE'
    });
    if (ok) {
      router.push('/transactions');
    }
  }

  return {
    createCategory,
    createWallet,
    deleteCategory,
    deleteTransaction,
    deleteWallet,
    isManaging,
    isPending,
    isSaving,
    createTransaction: addTransaction,
    updateCategory,
    updateTransaction,
    updateWallet
  };
}
