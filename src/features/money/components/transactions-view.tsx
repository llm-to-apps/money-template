'use client';

import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { DataTable } from 'mantine-datatable';
import { useLocale, useTranslations } from 'next-intl';

import {
  DeleteMenu,
  FormButtons,
  FormCard,
  TypeSelect
} from '@/features/money/components/form-controls';
import {
  categoryOptions,
  desktopTableColumnQuery,
  TablePanel,
  walletOptions
} from '@/features/money/components/view-primitives';
import type {
  CategoryRecord,
  MoneySnapshot,
  TransactionRecord,
  WalletRecord
} from '@/shared/money-types';
import {
  formatDate,
  formatDateInputValue,
  formatMoney,
  getInitialMainCategoryId,
  getInitialSubcategoryId,
  todayDateInputValue
} from '@/shared/money-utils';
import type { ApiResponse } from '@/shared/api';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;
type TransactionsPage = {
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
  transactions: TransactionRecord[];
};

const transactionPageSize = 12;

export function TransactionsList({ snapshot }: { snapshot: MoneySnapshot }) {
  const router = useRouter();
  const locale = useLocale();
  const common = useTranslations('Common');
  const transactions = useTranslations('Transactions');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const initialTransactionsPage = snapshot.initialTransactionsPage;
  const [records, setRecords] = useState(initialTransactionsPage.transactions);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialTransactionsPage.pageInfo.nextCursor
  );
  const [hasNextPage, setHasNextPage] = useState(
    initialTransactionsPage.pageInfo.hasNextPage
  );
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  useEffect(() => {
    setRecords(initialTransactionsPage.transactions);
    setNextCursor(initialTransactionsPage.pageInfo.nextCursor);
    setHasNextPage(initialTransactionsPage.pageInfo.hasNextPage);
  }, [initialTransactionsPage]);

  const loadNextPage = useCallback(async () => {
    if (!hasNextPage || !nextCursor || isLoadingPage) {
      return;
    }

    setIsLoadingPage(true);
    try {
      const searchParams = new URLSearchParams({
        cursor: nextCursor,
        limit: String(transactionPageSize)
      });

      const response = await fetch(`/api/transactions/list?${searchParams}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ApiResponse<TransactionsPage>;

      if (!payload.ok) {
        return;
      }

      const page = payload.data;
      setRecords((current) => {
        const existingIds = new Set(current.map((record) => record.id));
        const newRecords = page.transactions.filter(
          (record) => !existingIds.has(record.id)
        );

        return [...current, ...newRecords];
      });
      setNextCursor(page.pageInfo.nextCursor);
      setHasNextPage(page.pageInfo.hasNextPage);
    } finally {
      setIsLoadingPage(false);
    }
  }, [hasNextPage, isLoadingPage, nextCursor]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;

    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadNextPage();
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [loadNextPage]);

  return (
    <TablePanel actionHref="/transactions/new" actionLabel={transactions('add')}>
      <DataTable<TransactionRecord>
        borderRadius="md"
        highlightOnHover
        idAccessor="id"
        fetching={isLoadingPage}
        minHeight={records.length === 0 ? 140 : undefined}
        noRecordsText={transactions('empty')}
        onRowClick={({ record }) =>
          router.push(`/transactions/${record.id}/edit`)
        }
        records={records}
        withTableBorder
        columns={[
          {
            accessor: 'category.label',
            title: common('category'),
            render: (transaction) => (
              <Text fw={600}>{transaction.category.label}</Text>
            )
          },
          {
            accessor: 'wallet.name',
            title: common('wallet'),
            visibleMediaQuery: desktopTableColumnQuery
          },
          {
            accessor: 'note',
            title: common('note'),
            visibleMediaQuery: desktopTableColumnQuery,
            render: (transaction) => (
              <Text c="dimmed">{transaction.note || common('noNote')}</Text>
            )
          },
          {
            accessor: 'occurredAt',
            title: common('date'),
            render: (transaction) => formatDate(transaction.occurredAt, locale)
          },
          {
            accessor: 'amountCents',
            noWrap: true,
            title: common('amount'),
            textAlign: 'right',
            render: (transaction) => (
              <Text
                c={transaction.type === 'INCOME' ? 'green' : 'red'}
                fw={700}
              >
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatMoney(transaction.amountCents, locale)}
              </Text>
            )
          }
        ]}
      />
      <Group justify="space-between" mt="md">
        <Text c="dimmed" size="sm">
          {transactions('shown', { count: records.length })}
        </Text>
        {isLoadingPage ? (
          <Text c="dimmed" size="sm">
            {transactions('loadingMore')}
          </Text>
        ) : null}
      </Group>
      {hasNextPage ? (
        <div ref={loadMoreRef} aria-hidden="true" style={{ height: 1 }} />
      ) : null}
    </TablePanel>
  );
}

export function TransactionForm({
  categories,
  isManaging,
  onDeleteTransaction,
  onSubmit,
  transaction,
  wallets
}: {
  categories: CategoryRecord[];
  isManaging: boolean;
  onDeleteTransaction: (transactionId: string) => void;
  onSubmit: MutationFormHandler;
  transaction: TransactionRecord;
  wallets: WalletRecord[];
}) {
  const common = useTranslations('Common');
  const transactions = useTranslations('Transactions');

  return (
    <FormCard
      isBusy={isManaging}
      actions={
        <DeleteMenu
          label={transactions('actions')}
          itemLabel={transactions('delete')}
          disabled={isManaging}
          onDelete={() => onDeleteTransaction(transaction.id)}
        />
      }
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TypeSelect defaultValue={transaction.type} />
            <NumberInput
              label={common('amount')}
              name="amount"
              defaultValue={transaction.amountCents / 100}
              min={0.01}
              step={0.01}
              required
            />
            <DateInput
              label={common('date')}
              name="occurredAt"
              defaultValue={formatDateInputValue(transaction.occurredAt)}
              required
            />
            <Select
              label={common('wallet')}
              hiddenInputProps={{ name: 'walletId' }}
              defaultValue={transaction.walletId}
              data={walletOptions(wallets, transaction.walletId)}
              required
            />
            <Select
              label={common('category')}
              hiddenInputProps={{ name: 'categoryId' }}
              defaultValue={transaction.categoryId}
              data={categoryOptions(categories, transaction.categoryId)}
              required
            />
          </SimpleGrid>
          <TextInput
            label={common('note')}
            name="note"
            defaultValue={transaction.note ?? ''}
            placeholder={transactions('notePlaceholder')}
          />
          <FormButtons cancelHref="/transactions" />
        </Stack>
      </form>
    </FormCard>
  );
}

export function AddTransactionForm({
  categories,
  defaultCategoryId,
  defaultWalletId,
  isPending,
  isSaving,
  onSubmit,
  wallets
}: {
  categories: CategoryRecord[];
  defaultCategoryId: string;
  defaultWalletId: string;
  isPending: boolean;
  isSaving: boolean;
  onSubmit: MutationFormHandler;
  wallets: WalletRecord[];
}) {
  const common = useTranslations('Common');
  const transactions = useTranslations('Transactions');
  const mainCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories]
  );
  const initialMainCategoryId = useMemo(
    () => getInitialMainCategoryId(categories, defaultCategoryId),
    [categories, defaultCategoryId]
  );
  const [mainCategoryId, setMainCategoryId] = useState(initialMainCategoryId);
  const subcategories = useMemo(
    () => categories.filter((category) => category.parentId === mainCategoryId),
    [categories, mainCategoryId]
  );
  const [subcategoryId, setSubcategoryId] = useState(
    getInitialSubcategoryId(
      categories,
      defaultCategoryId,
      initialMainCategoryId
    )
  );
  const effectiveCategoryId = subcategoryId || mainCategoryId;

  useEffect(() => {
    if (!mainCategories.some((category) => category.id === mainCategoryId)) {
      setMainCategoryId(initialMainCategoryId);
    }
  }, [initialMainCategoryId, mainCategories, mainCategoryId]);

  useEffect(() => {
    if (!subcategories.some((category) => category.id === subcategoryId)) {
      setSubcategoryId(subcategories[0]?.id ?? '');
    }
  }, [subcategoryId, subcategories]);

  return (
    <FormCard isBusy={isSaving}>
      <form action="/api/transactions" method="post" onSubmit={onSubmit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TypeSelect />
            <NumberInput
              label={common('amount')}
              name="amount"
              min={0.01}
              step={0.01}
              placeholder="42.00"
              required
            />
            <DateInput
              label={common('date')}
              name="occurredAt"
              defaultValue={todayDateInputValue()}
              required
            />
            <Select
              label={common('wallet')}
              hiddenInputProps={{ name: 'walletId' }}
              defaultValue={defaultWalletId}
              data={wallets.map((wallet) => ({
                value: wallet.id,
                label: wallet.name
              }))}
              required
            />
            <Select
              label={common('category')}
              value={mainCategoryId}
              onChange={(value) => {
                if (!value) {
                  return;
                }
                setMainCategoryId(value);
                setSubcategoryId(
                  categories.find((category) => category.parentId === value)
                    ?.id ?? ''
                );
              }}
              data={mainCategories.map((category) => ({
                value: category.id,
                label: category.name
              }))}
              required
            />
            <Select
              label={transactions('subcategory')}
              value={subcategoryId}
              onChange={(value) => setSubcategoryId(value ?? '')}
              disabled={subcategories.length === 0}
              data={
                subcategories.length > 0
                  ? subcategories.map((category) => ({
                      value: category.id,
                      label: category.name
                    }))
                  : [{ value: '', label: transactions('subcategoriesEmpty') }]
              }
            />
          </SimpleGrid>
          <input name="categoryId" type="hidden" value={effectiveCategoryId} />
          <TextInput
            label={common('note')}
            name="note"
            placeholder={transactions('notePlaceholder')}
          />
          <FormButtons
            cancelHref="/transactions"
            saveDisabled={isPending}
            isSaving={isSaving}
          />
        </Stack>
      </form>
    </FormCard>
  );
}
