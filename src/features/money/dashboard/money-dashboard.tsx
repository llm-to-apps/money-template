'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Alert, Center } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { MoneyDashboardShell } from '@/features/money/dashboard/money-dashboard-shell';
import { useMoneyMutations } from '@/features/money/dashboard/use-money-mutations';
import { useMoneySnapshot } from '@/features/money/dashboard/use-money-snapshot';
import {
  ActionErrorModal,
  RouteView
} from '@/features/money/components/money-views';
import { RouteSkeleton } from '@/features/money/components/loading-skeletons';
import type { MoneyDashboardProps } from '@/shared/money-types';
import { routeModeFromPathname, viewFromPathname } from '@/shared/money-utils';

export function MoneyDashboard({
  initialIsEmbedded,
  initialUser
}: MoneyDashboardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpened, mobileNav] = useDisclosure(false);
  const currentView = viewFromPathname(pathname);
  const routeMode = routeModeFromPathname(pathname);
  const {
    activeCategories,
    activeWallets,
    error,
    loadSnapshot,
    setError,
    setSnapshot,
    snapshot,
    user
  } = useMoneySnapshot({ initialUser });
  const mutations = useMoneyMutations({
    loadSnapshot,
    router,
    setError,
    setSnapshot,
    snapshot
  });

  if (error && !snapshot) {
    return (
      <Center mih="100vh">
        <Alert color="red" title="Could not load Money">
          {error}
        </Alert>
      </Center>
    );
  }

  if (!snapshot) {
    return (
      <MoneyDashboardShell
        currentView={currentView}
        displayName={user.displayName ?? 'Local'}
        isEmbedded={initialIsEmbedded}
        mobileNavOpened={mobileNavOpened}
        onCloseMobileNav={mobileNav.close}
        onToggleMobileNav={mobileNav.toggle}
      >
        <RouteSkeleton routeMode={routeMode} view={currentView} />
      </MoneyDashboardShell>
    );
  }

  return (
    <MoneyDashboardShell
      currentView={currentView}
      displayName={user.displayName ?? 'Local'}
      isEmbedded={initialIsEmbedded}
      mobileNavOpened={mobileNavOpened}
      onCloseMobileNav={mobileNav.close}
      onToggleMobileNav={mobileNav.toggle}
    >
      <ActionErrorModal error={error} onDismiss={() => setError(null)} />
      <RouteView
        isManaging={mutations.isManaging}
        onCreateCategory={mutations.createCategory}
        onCreateTransaction={mutations.createTransaction}
        onCreateWallet={mutations.createWallet}
        onDeleteCategory={mutations.deleteCategory}
        onDeleteTransaction={mutations.deleteTransaction}
        onDeleteWallet={mutations.deleteWallet}
        onUpdateCategory={mutations.updateCategory}
        onUpdateTransaction={mutations.updateTransaction}
        onUpdateWallet={mutations.updateWallet}
        routeMode={routeMode}
        snapshot={snapshot}
        view={currentView}
        isPending={mutations.isPending}
        isSaving={mutations.isSaving}
        defaultCategoryId={activeCategories[0]?.id ?? ''}
        defaultWalletId={activeWallets[0]?.id ?? ''}
      />
    </MoneyDashboardShell>
  );
}
