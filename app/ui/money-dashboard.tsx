'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from 'react';
import {
  Alert,
  AppShell,
  Burger,
  Center,
  Container,
  Group,
  Image,
  NavLink,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { LayoutDashboard, ReceiptText, Tags, Wallet, WalletCards } from 'lucide-react';

import type {
  AuthErrorPayload,
  MoneyDashboardPayload,
  MoneyDashboardProps,
  MoneySnapshot,
  MoneyUser,
  MoneyView,
  TransactionRecord,
  TransactionType
} from './money-types';
import { ActionErrorModal, RouteView, Splash, UserMenu } from './money-views';
import { formatDateInputValue, viewFromPathname, routeModeFromPathname, waitForUiDelay } from './money-utils';


export function MoneyDashboard({
  initialIsEmbedded,
  initialUser
}: MoneyDashboardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<MoneySnapshot | null>(null);
  const [user, setUser] = useState<MoneyUser>(initialUser);
  const [isEmbedded] = useState(initialIsEmbedded);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [mobileNavOpened, mobileNav] = useDisclosure(false);
  const [isPending, startTransition] = useTransition();
  const optimisticId = useRef(0);
  const splashStartedAt = useRef(Date.now());
  const activeCategories =
    snapshot?.categories.filter((category) => category.status === 'ACTIVE') ?? [];
  const activeWallets =
    snapshot?.wallets.filter((wallet) => wallet.status === 'ACTIVE') ?? [];
  const defaultCategoryId = activeCategories[0]?.id ?? '';
  const defaultWalletId = activeWallets[0]?.id ?? '';
  const currentView = viewFromPathname(pathname);
  const routeMode = routeModeFromPathname(pathname);

  useEffect(() => {
    void loadSnapshot({ showLoading: true });

    const events = new EventSource('/api/events');
    events.addEventListener('money.updated', () => {
      void loadSnapshot();
    });

    return () => {
      events.close();
    };
  }, []);

  useEffect(() => {
    if (isLoading || !showSplash) {
      return;
    }

    const elapsed = Date.now() - splashStartedAt.current;
    const exitDelay = Math.max(0, 800 - elapsed);
    const hideTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, exitDelay);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [isLoading, showSplash]);

  const categoryById = useMemo(
    () =>
      new Map(
        (snapshot?.categories ?? []).map((category) => [category.id, category])
      ),
    [snapshot?.categories]
  );

  async function loadSnapshot(options: { showLoading?: boolean } = {}) {
    if (options.showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/transactions', {
        cache: 'no-store'
      });

      if (response.status === 401) {
        const payload = (await response.json().catch(() => null)) as
          | AuthErrorPayload
          | null;
        window.location.replace(payload?.redirectTo ?? '/auth/login');
        return;
      }

      if (!response.ok) {
        setError('Could not load transactions.');
        return;
      }

      const nextSnapshot = (await response.json()) as MoneyDashboardPayload;
      startTransition(() => {
        setSnapshot({
          categories: nextSnapshot.categories,
          categoryBreakdown: nextSnapshot.categoryBreakdown,
          monthDynamics: nextSnapshot.monthDynamics,
          summary: nextSnapshot.summary,
          transactions: nextSnapshot.transactions,
          wallets: nextSnapshot.wallets
        });
        setUser(nextSnapshot.user);
      });
    } catch {
      setError('Could not load transactions.');
    } finally {
      if (options.showLoading) {
        setIsLoading(false);
      }
    }
  }

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

    if (!category || !wallet || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(occurredAt.getTime())) {
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
            transactions: [optimisticTransaction, ...current.transactions].slice(
              0,
              12
            ),
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

      const nextSnapshot = (await response.json()) as MoneySnapshot;
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
          message?: string;
        } | null;
        setError(payload?.message ?? 'Could not save changes.');
        return false;
      }

      const nextSnapshot = (await response.json()) as MoneySnapshot;
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

  async function updateWallet(event: FormEvent<HTMLFormElement>, walletId: string) {
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

  if (showSplash) {
    return <Splash />;
  }

  if (!snapshot) {
    return (
      <Center mih="100vh">
        <Alert color="red" title="Could not load Money">
          {error ?? 'Could not load money dashboard.'}
        </Alert>
      </Center>
    );
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { desktop: true, mobile: !mobileNavOpened }
      }}
      footer={{ height: 44, offset: false }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <Burger
                opened={mobileNavOpened}
                onClick={mobileNav.toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label="Open navigation"
              />
              <ThemeIcon size="lg" radius="md" variant="filled">
                <Wallet size={20} />
              </ThemeIcon>
              <Group gap={4} visibleFrom="sm">
                {moneyNavItems.map((item) => (
                  <NavLink
                    key={item.href}
                    component={Link}
                    href={item.href}
                    active={item.view === currentView}
                    label={item.label}
                    leftSection={item.icon}
                    variant="light"
                    w="auto"
                    px="sm"
                  />
                ))}
              </Group>
            </Group>

            <UserMenu
              displayName={user.displayName ?? 'Local'}
              isEmbedded={isEmbedded}
            />
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {moneyNavItems.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              active={item.view === currentView}
              label={item.label}
              leftSection={item.icon}
              onClick={mobileNav.close}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="lg">
          <ActionErrorModal error={error} onDismiss={() => setError(null)} />
          <RouteView
            isManaging={isManaging}
            onCreateCategory={createCategory}
            onCreateTransaction={addTransaction}
            onCreateWallet={createWallet}
            onDeleteCategory={deleteCategory}
            onDeleteTransaction={deleteTransaction}
            onDeleteWallet={deleteWallet}
            onUpdateCategory={updateCategory}
            onUpdateTransaction={updateTransaction}
            onUpdateWallet={updateWallet}
            routeMode={routeMode}
            snapshot={snapshot}
            view={currentView}
            isPending={isPending}
            isSaving={isSaving}
            defaultCategoryId={defaultCategoryId}
            defaultWalletId={defaultWalletId}
          />
        </Container>
      </AppShell.Main>

      <AppShell.Footer pos="static">
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between">
            <Text size="xs" c="dimmed">
              Track income, expenses, and monthly cash flow.
            </Text>
            <a
              aria-label="OS7"
              href="https://www.os7.dev"
              rel="noreferrer"
              target="_blank"
            >
              <Image alt="OS7" src="/brand/os7-logo.svg" h={18} />
            </a>
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}

const moneyNavItems: Array<{
  href: string;
  icon: ReactNode;
  label: string;
  view: MoneyView;
}> = [
  {
    href: '/',
    icon: <LayoutDashboard size={16} />,
    label: 'Dashboard',
    view: 'dashboard'
  },
  {
    href: '/transactions',
    icon: <ReceiptText size={16} />,
    label: 'Transactions',
    view: 'transactions'
  },
  {
    href: '/wallets',
    icon: <WalletCards size={16} />,
    label: 'Wallets',
    view: 'wallets'
  },
  {
    href: '/categories',
    icon: <Tags size={16} />,
    label: 'Categories',
    view: 'categories'
  }
];
