'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Card,
  Center,
  ColorInput,
  Group,
  Loader,
  LoadingOverlay,
  Menu,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title
} from '@mantine/core';
import type { MantineTheme } from '@mantine/core';
import { BarChart, Sparkline } from '@mantine/charts';
import { DateInput } from '@mantine/dates';
import { DataTable } from 'mantine-datatable';
import {
  AlertCircle,
  ChevronRight,
  Home,
  LogOut,
  MoreHorizontal,
  Plus,
  Trash2
} from 'lucide-react';

import type {
  CategoryRecord,
  MoneyRouteMode,
  MoneySnapshot,
  MoneyView,
  RecordStatus,
  TransactionRecord,
  WalletRecord
} from './money-types';
import {
  formatDate,
  formatDateInputValue,
  formatMoney,
  getInitialMainCategoryId,
  getInitialSubcategoryId,
  todayDateInputValue,
} from './money-utils';

const categoryScopes = ['INCOME', 'EXPENSE', 'BOTH'];
const desktopTableColumnQuery = (theme: MantineTheme) =>
  `(min-width: ${theme.breakpoints.sm})`;
const colorSwatches = [
  '#059669',
  '#0a9f72',
  '#14b8a6',
  '#0891b2',
  '#0284c7',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#9333ea',
  '#db2777',
  '#e11d48',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#65a30d',
  '#475569'
];

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
  onUpdateCategory: (event: FormEvent<HTMLFormElement>, categoryId: string) => void;
  onUpdateTransaction: (event: FormEvent<HTMLFormElement>, transactionId: string) => void;
  onUpdateWallet: (event: FormEvent<HTMLFormElement>, walletId: string) => void;
  routeMode: MoneyRouteMode;
  snapshot: MoneySnapshot;
  view: MoneyView;
}) {
  if (view === 'transactions') {
    if (routeMode.action === 'new') {
      return (
        <ViewStack>
          <MoneyBreadcrumbs items={[homeCrumb, { href: '/transactions', label: 'Transactions' }, { label: 'Add' }]} />
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
      const transaction = snapshot.transactions.find((item) => item.id === routeMode.id);
      return (
        <ViewStack>
          <MoneyBreadcrumbs items={[homeCrumb, { href: '/transactions', label: 'Transactions' }, { label: transaction?.category.label ?? 'Edit' }]} />
          {transaction ? (
            <TransactionForm
              categories={snapshot.categories}
              isManaging={isManaging}
              onDeleteTransaction={onDeleteTransaction}
              onSubmit={(event) => onUpdateTransaction(event, transaction.id)}
              transaction={transaction}
              wallets={snapshot.wallets}
            />
          ) : (
            <Card withBorder>Transaction not found.</Card>
          )}
        </ViewStack>
      );
    }

    return (
      <ViewStack>
        <MoneyBreadcrumbs items={[homeCrumb, { label: 'Transactions' }]} />
        <TransactionsList snapshot={snapshot} />
      </ViewStack>
    );
  }

  if (view === 'wallets') {
    if (routeMode.action === 'new') {
      return (
        <ViewStack>
          <MoneyBreadcrumbs items={[homeCrumb, { href: '/wallets', label: 'Wallets' }, { label: 'Add' }]} />
          <WalletForm isManaging={isManaging} onSubmit={onCreateWallet} />
        </ViewStack>
      );
    }

    if (routeMode.action === 'edit') {
      const wallet = snapshot.wallets.find((item) => item.id === routeMode.id);
      return (
        <ViewStack>
          <MoneyBreadcrumbs items={[homeCrumb, { href: '/wallets', label: 'Wallets' }, { label: wallet?.name ?? 'Edit' }]} />
          {wallet ? (
            <WalletForm
              isManaging={isManaging}
              onDeleteWallet={onDeleteWallet}
              onSubmit={(event) => onUpdateWallet(event, wallet.id)}
              wallet={wallet}
            />
          ) : (
            <Card withBorder>Wallet not found.</Card>
          )}
        </ViewStack>
      );
    }

    return (
      <ViewStack>
        <MoneyBreadcrumbs items={[homeCrumb, { label: 'Wallets' }]} />
        <WalletsList snapshot={snapshot} />
      </ViewStack>
    );
  }

  if (view === 'categories') {
    if (routeMode.action === 'new') {
      return (
        <ViewStack>
          <MoneyBreadcrumbs items={[homeCrumb, { href: '/categories', label: 'Categories' }, { label: 'Add' }]} />
          <CategoryForm
            categories={snapshot.categories}
            isManaging={isManaging}
            onSubmit={onCreateCategory}
          />
        </ViewStack>
      );
    }

    if (routeMode.action === 'edit') {
      const category = snapshot.categories.find((item) => item.id === routeMode.id);
      return (
        <ViewStack>
          <MoneyBreadcrumbs items={[homeCrumb, { href: '/categories', label: 'Categories' }, { label: category?.label ?? 'Edit' }]} />
          {category ? (
            <CategoryForm
              categories={snapshot.categories}
              category={category}
              isManaging={isManaging}
              onDeleteCategory={onDeleteCategory}
              onSubmit={(event) => onUpdateCategory(event, category.id)}
            />
          ) : (
            <Card withBorder>Category not found.</Card>
          )}
        </ViewStack>
      );
    }

    return (
      <ViewStack>
        <MoneyBreadcrumbs items={[homeCrumb, { label: 'Categories' }]} />
        <CategoriesList snapshot={snapshot} />
      </ViewStack>
    );
  }

  return (
    <Stack>
      <SummaryCards snapshot={snapshot} />
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <WalletsPanel snapshot={snapshot} />
        <CategorySpendPanel snapshot={snapshot} />
      </SimpleGrid>
      <TrendPanel snapshot={snapshot} />
      <TransactionsPanel snapshot={snapshot} />
    </Stack>
  );
}

function ViewStack({ children }: { children: ReactNode }) {
  return <Stack>{children}</Stack>;
}

const homeCrumb = { href: '/', label: 'Money' };

function MoneyBreadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <Breadcrumbs separator={<ChevronRight size={14} />}>
      {items.map((item, index) =>
        item.href && index !== items.length - 1 ? (
          <Button
            key={`${item.label}-${index}`}
            component={Link}
            href={item.href}
            variant="subtle"
            size="compact-sm"
            leftSection={item.href === '/' ? <Home size={15} /> : undefined}
          >
            {item.href === '/' ? 'Home' : item.label}
          </Button>
        ) : (
          <Text key={`${item.label}-${index}`} c="dimmed">
            {item.label}
          </Text>
        )
      )}
    </Breadcrumbs>
  );
}

function SummaryCards({ snapshot }: { snapshot: MoneySnapshot }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }}>
      <StatCard
        label="Balance"
        value={formatMoney(snapshot.summary.balanceCents)}
        color={snapshot.summary.balanceCents >= 0 ? 'green' : 'red'}
        trend={snapshot.monthDynamics.map((month) => month.balanceCents)}
      />
      <StatCard
        label="This month"
        value={formatMoney(snapshot.summary.currentMonth.incomeCents)}
        color="green"
        description={`Net ${formatMoney(snapshot.summary.currentMonth.balanceCents)}`}
        trend={snapshot.monthDynamics.map((month) => month.incomeCents)}
      />
      <StatCard
        label="Month expenses"
        value={formatMoney(snapshot.summary.currentMonth.expensesCents)}
        color="red"
        description={`Previous ${formatMoney(snapshot.summary.previousMonth.expensesCents)}`}
        trend={snapshot.monthDynamics.map((month) => month.expensesCents)}
      />
    </SimpleGrid>
  );
}

function StatCard({
  color,
  description,
  label,
  trend,
  value
}: {
  color: string;
  description?: string;
  label: string;
  trend: number[];
  value: string;
}) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Text c="dimmed">{label}</Text>
      <Text mt={6} fw={700} size="xl" c={color}>{value}</Text>
      {description ? <Text mt={4} size="xs" c="dimmed">{description}</Text> : null}
      <Sparkline
        mt="md"
        h={48}
        data={trend.map((value) => value / 100)}
        trendColors={{ positive: 'green.6', negative: 'red.6', neutral: 'gray.5' }}
        fillOpacity={0.16}
        curveType="natural"
      />
    </Card>
  );
}

function WalletsPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">Wallets</Title>
      <Stack gap="sm">
        {snapshot.wallets.map((wallet) => (
          <Group key={wallet.id} justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <ColorDot color={wallet.color} />
              <Box>
                <Text fw={600}>{wallet.name}</Text>
                <Text c="dimmed">
                  {wallet.currency}
                  {wallet.comment ? ` · ${wallet.comment}` : ''}
                </Text>
              </Box>
            </Group>
            <Text fw={700}>{formatMoney(wallet.balanceCents)}</Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function CategorySpendPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const data = snapshot.categoryBreakdown.slice(0, 8).map((category) => ({
    amount: category.amountCents,
    category: category.label
  }));

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">Category spend</Title>
      {data.length === 0 ? (
        <Text c="dimmed">No expenses this month.</Text>
      ) : (
        <BarChart
          h={Math.max(260, data.length * 44)}
          data={data}
          dataKey="category"
          gridAxis="x"
          orientation="vertical"
          series={[{ name: 'amount', label: 'Amount', color: 'blue.6' }]}
          tickLine="none"
          valueFormatter={formatMoney}
          withTooltip
          xAxisProps={{ tickFormatter: (value) => formatMoney(Number(value)) }}
          yAxisProps={{ width: 128 }}
        />
      )}
    </Card>
  );
}

function TablePanel({
  actionHref,
  actionLabel,
  children
}: {
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Group justify="flex-end" mb="md">
        <ActionIcon component={Link} href={actionHref} aria-label={actionLabel} title={actionLabel} size="lg" radius="md">
          <Plus size={18} />
        </ActionIcon>
      </Group>
      {children}
    </Card>
  );
}

function TransactionsList({ snapshot }: { snapshot: MoneySnapshot }) {
  const router = useRouter();

  return (
    <TablePanel actionHref="/transactions/new" actionLabel="Add transaction">
      <DataTable<TransactionRecord>
        borderRadius="md"
        highlightOnHover
        idAccessor="id"
        minHeight={snapshot.transactions.length === 0 ? 140 : undefined}
        noRecordsText="No transactions yet."
        onRowClick={({ record }) => router.push(`/transactions/${record.id}/edit`)}
        records={snapshot.transactions}
        withTableBorder
        columns={[
          {
            accessor: 'category.label',
            title: 'Category',
            render: (transaction) => <Text fw={600}>{transaction.category.label}</Text>
          },
          {
            accessor: 'wallet.name',
            title: 'Wallet',
            visibleMediaQuery: desktopTableColumnQuery
          },
          {
            accessor: 'note',
            title: 'Note',
            visibleMediaQuery: desktopTableColumnQuery,
            render: (transaction) => <Text c="dimmed">{transaction.note || 'No note'}</Text>
          },
          {
            accessor: 'occurredAt',
            title: 'Date',
            render: (transaction) => formatDate(transaction.occurredAt)
          },
          {
            accessor: 'amountCents',
            noWrap: true,
            title: 'Amount',
            textAlign: 'right',
            render: (transaction) => (
              <Text c={transaction.type === 'INCOME' ? 'green' : 'red'} fw={700}>
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatMoney(transaction.amountCents)}
              </Text>
            )
          }
        ]}
      />
    </TablePanel>
  );
}

function WalletsList({ snapshot }: { snapshot: MoneySnapshot }) {
  const router = useRouter();

  return (
    <TablePanel actionHref="/wallets/new" actionLabel="Add wallet">
      <DataTable<WalletRecord>
        borderRadius="md"
        highlightOnHover
        idAccessor="id"
        minHeight={snapshot.wallets.length === 0 ? 140 : undefined}
        noRecordsText="No wallets yet."
        onRowClick={({ record }) => router.push(`/wallets/${record.id}/edit`)}
        records={snapshot.wallets}
        withTableBorder
        columns={[
          {
            accessor: 'name',
            title: 'Name',
            render: (wallet) => (
              <Group gap="xs">
                <ColorDot color={wallet.color} />
                <Text fw={600}>{wallet.name}</Text>
                {wallet.status === 'ARCHIVED' ? <Badge variant="light" color="gray">Archived</Badge> : null}
              </Group>
            )
          },
          {
            accessor: 'comment',
            title: 'Comment',
            visibleMediaQuery: desktopTableColumnQuery,
            render: (wallet) => <Text c="dimmed">{wallet.comment || 'No comment'}</Text>
          },
          {
            accessor: 'currency',
            title: 'Currency',
            visibleMediaQuery: desktopTableColumnQuery
          },
          {
            accessor: 'balanceCents',
            noWrap: true,
            title: 'Balance',
            textAlign: 'right',
            render: (wallet) => <Text fw={700}>{formatMoney(wallet.balanceCents)}</Text>
          }
        ]}
      />
    </TablePanel>
  );
}

function CategoriesList({ snapshot }: { snapshot: MoneySnapshot }) {
  const router = useRouter();

  return (
    <TablePanel actionHref="/categories/new" actionLabel="Add category">
      <DataTable<CategoryRecord>
        borderRadius="md"
        highlightOnHover
        idAccessor="id"
        minHeight={snapshot.categories.length === 0 ? 140 : undefined}
        noRecordsText="No categories yet."
        onRowClick={({ record }) => router.push(`/categories/${record.id}/edit`)}
        records={snapshot.categories}
        withTableBorder
        columns={[
          {
            accessor: 'name',
            title: 'Name',
            render: (category) => (
              <Group gap="xs">
                <ColorDot color={category.color} />
                <Text fw={600}>{category.label}</Text>
                {category.status === 'ARCHIVED' ? <Badge variant="light" color="gray">Archived</Badge> : null}
              </Group>
            )
          },
          {
            accessor: 'parent.name',
            title: 'Parent',
            visibleMediaQuery: desktopTableColumnQuery,
            render: (category) => <Text c="dimmed">{category.parent?.name ?? '-'}</Text>
          },
          {
            accessor: 'scope',
            title: 'Scope',
            render: (category) => category.scope.toLowerCase()
          }
        ]}
      />
    </TablePanel>
  );
}

function TransactionForm({
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
  return (
    <FormCard
      isBusy={isManaging}
      actions={<DeleteMenu label="Transaction actions" itemLabel="Delete transaction" disabled={isManaging} onDelete={() => onDeleteTransaction(transaction.id)} />}
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TypeSelect defaultValue={transaction.type} />
            <NumberInput label="Amount" name="amount" defaultValue={transaction.amountCents / 100} min={0.01} step={0.01} required />
            <DateInput label="Date" name="occurredAt" defaultValue={formatDateInputValue(transaction.occurredAt)} required />
            <Select label="Wallet" hiddenInputProps={{ name: 'walletId' }} defaultValue={transaction.walletId} data={walletOptions(wallets, transaction.walletId)} required />
            <Select label="Category" hiddenInputProps={{ name: 'categoryId' }} defaultValue={transaction.categoryId} data={categoryOptions(categories, transaction.categoryId)} required />
          </SimpleGrid>
          <TextInput label="Note" name="note" defaultValue={transaction.note ?? ''} placeholder="Coffee, invoice, rent" />
          <FormButtons cancelHref="/transactions" />
        </Stack>
      </form>
    </FormCard>
  );
}

function WalletForm({
  isManaging,
  onDeleteWallet,
  onSubmit,
  wallet
}: {
  isManaging: boolean;
  onDeleteWallet?: (walletId: string) => void;
  onSubmit: MutationFormHandler;
  wallet?: WalletRecord;
}) {
  return (
    <FormCard
      isBusy={isManaging}
      actions={wallet && onDeleteWallet ? <DeleteMenu label="Wallet actions" itemLabel="Delete wallet" disabled={isManaging} onDelete={() => onDeleteWallet(wallet.id)} /> : null}
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Name" name="name" defaultValue={wallet?.name ?? ''} placeholder="Wallet name" required />
            <TextInput label="Comment" name="comment" defaultValue={wallet?.comment ?? ''} placeholder="Card, cash, bank account" />
            <TextInput label="Currency" name="currency" defaultValue={wallet?.currency ?? 'USD'} required />
            <ColorInput label="Color" name="color" defaultValue={wallet?.color ?? '#059669'} swatches={colorSwatches} />
            <NumberInput label="Initial balance" name="initialBalance" defaultValue={wallet ? wallet.initialBalanceCents / 100 : 0} step={0.01} />
          </SimpleGrid>
          {wallet ? <StatusSwitch status={wallet.status} /> : null}
          <FormButtons cancelHref="/wallets" />
        </Stack>
      </form>
    </FormCard>
  );
}

function CategoryForm({
  categories,
  category,
  isManaging,
  onDeleteCategory,
  onSubmit
}: {
  categories: CategoryRecord[];
  category?: CategoryRecord;
  isManaging: boolean;
  onDeleteCategory?: (categoryId: string) => void;
  onSubmit: MutationFormHandler;
}) {
  const parents = categories.filter((item) => !item.parentId && item.status === 'ACTIVE' && item.id !== category?.id);

  return (
    <FormCard
      isBusy={isManaging}
      actions={category && onDeleteCategory ? <DeleteMenu label="Category actions" itemLabel="Delete category" disabled={isManaging} onDelete={() => onDeleteCategory(category.id)} /> : null}
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Name" name="name" defaultValue={category?.name ?? ''} placeholder="Category or subcategory name" required />
            <Select label="Parent" hiddenInputProps={{ name: 'parentId' }} defaultValue={category?.parentId ?? 'none'} data={[{ value: 'none', label: 'No parent' }, ...parents.map((parent) => ({ value: parent.id, label: parent.name }))]} />
            <Select label="Scope" hiddenInputProps={{ name: 'scope' }} defaultValue={category?.scope ?? 'BOTH'} data={categoryScopes.map((scope) => ({ value: scope, label: scope }))} />
            <ColorInput label="Color" name="color" defaultValue={category?.color ?? '#059669'} swatches={colorSwatches} />
          </SimpleGrid>
          {category ? <StatusSwitch status={category.status} /> : null}
          <FormButtons cancelHref="/categories" />
        </Stack>
      </form>
    </FormCard>
  );
}

function AddTransactionForm({
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
  const mainCategories = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const initialMainCategoryId = useMemo(() => getInitialMainCategoryId(categories, defaultCategoryId), [categories, defaultCategoryId]);
  const [mainCategoryId, setMainCategoryId] = useState(initialMainCategoryId);
  const subcategories = useMemo(() => categories.filter((category) => category.parentId === mainCategoryId), [categories, mainCategoryId]);
  const [subcategoryId, setSubcategoryId] = useState(getInitialSubcategoryId(categories, defaultCategoryId, initialMainCategoryId));
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
            <NumberInput label="Amount" name="amount" min={0.01} step={0.01} placeholder="42.00" required />
            <DateInput label="Date" name="occurredAt" defaultValue={todayDateInputValue()} required />
            <Select label="Wallet" hiddenInputProps={{ name: 'walletId' }} defaultValue={defaultWalletId} data={wallets.map((wallet) => ({ value: wallet.id, label: wallet.name }))} required />
            <Select
              label="Category"
              value={mainCategoryId}
              onChange={(value) => {
                if (!value) {
                  return;
                }
                setMainCategoryId(value);
                setSubcategoryId(categories.find((category) => category.parentId === value)?.id ?? '');
              }}
              data={mainCategories.map((category) => ({ value: category.id, label: category.name }))}
              required
            />
            <Select
              label="Subcategory"
              value={subcategoryId}
              onChange={(value) => setSubcategoryId(value ?? '')}
              disabled={subcategories.length === 0}
              data={subcategories.length > 0 ? subcategories.map((category) => ({ value: category.id, label: category.name })) : [{ value: '', label: 'No subcategories' }]}
            />
          </SimpleGrid>
          <input name="categoryId" type="hidden" value={effectiveCategoryId} />
          <TextInput label="Note" name="note" placeholder="Coffee, invoice, rent" />
          <FormButtons cancelHref="/transactions" saveDisabled={isPending} isSaving={isSaving} />
        </Stack>
      </form>
    </FormCard>
  );
}

function TypeSelect({ defaultValue = 'EXPENSE' }: { defaultValue?: string }) {
  return (
    <Select
      label="Type"
      hiddenInputProps={{ name: 'type' }}
      defaultValue={defaultValue}
      data={[{ value: 'EXPENSE', label: 'Expense' }, { value: 'INCOME', label: 'Income' }]}
      required
    />
  );
}

function FormCard({ actions, children, isBusy }: { actions?: ReactNode; children: ReactNode; isBusy: boolean }) {
  return (
    <Card withBorder shadow="sm" radius="md" pos="relative">
      <LoadingOverlay visible={isBusy} zIndex={10} overlayProps={{ blur: 0 }} />
      {actions ? <Group justify="flex-end" mb="sm">{actions}</Group> : null}
      {children}
    </Card>
  );
}

function FormButtons({ cancelHref, isSaving = false, saveDisabled = false }: { cancelHref: string; isSaving?: boolean; saveDisabled?: boolean }) {
  return (
    <Group mt="sm">
      <Button type="submit" loading={isSaving} disabled={saveDisabled}>Save</Button>
      <Button component={Link} href={cancelHref} variant="default">Cancel</Button>
    </Group>
  );
}

function DeleteMenu({ disabled, itemLabel, label, onDelete }: { disabled: boolean; itemLabel: string; label: string; onDelete: () => void }) {
  return (
    <Menu shadow="md" position="bottom-end">
      <Menu.Target>
        <ActionIcon aria-label={label} disabled={disabled} radius="md" variant="default">
          <MoreHorizontal size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={onDelete}>
          {itemLabel}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function StatusSwitch({ status }: { status: RecordStatus }) {
  return (
    <Box>
      <input name="status" type="hidden" value="ACTIVE" />
      <Switch
        name="status"
        value="ARCHIVED"
        defaultChecked={status === 'ARCHIVED'}
        label="Archived"
        description="Hide a closed item without deleting its history."
      />
    </Box>
  );
}

export function ActionErrorModal({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  return (
    <Modal opened={Boolean(error)} onClose={onDismiss} title="Action failed" centered>
      <Alert color="red" icon={<AlertCircle size={18} />}>{error}</Alert>
      <Group mt="md" justify="flex-end">
        <Button onClick={onDismiss}>OK</Button>
      </Group>
    </Modal>
  );
}

function TrendPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const data = snapshot.monthDynamics.map((month) => ({
    expenses: month.expensesCents,
    income: month.incomeCents,
    month: month.label
  }));

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">Monthly dynamics</Title>
      <BarChart
        h={260}
        data={data}
        dataKey="month"
        series={[
          { name: 'income', label: 'Income', color: 'green.6' },
          { name: 'expenses', label: 'Expenses', color: 'red.6' }
        ]}
        valueFormatter={formatMoney}
        tickLine="y"
        gridAxis="y"
        withLegend
      />
    </Card>
  );
}

function TransactionsPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">Recent transactions</Title>
      <Stack gap="sm">
        {snapshot.transactions.length === 0 ? (
          <Text c="dimmed">No transactions yet.</Text>
        ) : (
          snapshot.transactions.slice(0, 8).map((transaction) => (
            <Group key={transaction.id} justify="space-between" wrap="nowrap">
              <Box>
                <Text fw={600}>{transaction.category.label}</Text>
                <Text c="dimmed">
                  {transaction.wallet.name} · {transaction.note || 'No note'} · {formatDate(transaction.occurredAt)}
                </Text>
              </Box>
              <Text c={transaction.type === 'INCOME' ? 'green' : 'red'} fw={700}>
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatMoney(transaction.amountCents)}
              </Text>
            </Group>
          ))
        )}
      </Stack>
    </Card>
  );
}

export function UserMenu({ displayName, isEmbedded }: { displayName: string; isEmbedded: boolean }) {
  const initials = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';

  return (
    <Menu shadow="md" position="bottom-end">
      <Menu.Target>
        <Button variant="subtle" color="gray" leftSection={<Avatar size={28}>{initials}</Avatar>}>
          {displayName}
        </Button>
      </Menu.Target>
      {!isEmbedded ? (
        <Menu.Dropdown>
          <form action="/api/auth/logout" method="post">
            <Menu.Item component="button" type="submit" color="red" leftSection={<LogOut size={16} />}>
              Sign out
            </Menu.Item>
          </form>
        </Menu.Dropdown>
      ) : null}
    </Menu>
  );
}

export function Splash() {
  return (
    <Center mih="100vh">
      <Loader size="lg" />
    </Center>
  );
}

function ColorDot({ color }: { color: string }) {
  return <ThemeIcon aria-hidden="true" size={12} radius="xl" bg={color} variant="filled" />;
}

function isActive<T extends { status: RecordStatus }>(item: T) {
  return item.status === 'ACTIVE';
}

function walletOptions(wallets: WalletRecord[], selectedId: string) {
  return wallets
    .filter((wallet) => wallet.status === 'ACTIVE' || wallet.id === selectedId)
    .map((wallet) => ({ value: wallet.id, label: wallet.name }));
}

function categoryOptions(categories: CategoryRecord[], selectedId: string) {
  return categories
    .filter((category) => category.status === 'ACTIVE' || category.id === selectedId)
    .map((category) => ({ value: category.id, label: category.label }));
}
