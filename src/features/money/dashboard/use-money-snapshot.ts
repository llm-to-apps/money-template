'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition
} from 'react';

import type {
  AuthErrorPayload,
  MoneyDashboardPayload,
  MoneySnapshot,
  MoneyUser
} from '@/shared/money-types';

export function useMoneySnapshot({ initialUser }: { initialUser: MoneyUser }) {
  const [snapshot, setSnapshot] = useState<MoneySnapshot | null>(null);
  const [user, setUser] = useState<MoneyUser>(initialUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [, startTransition] = useTransition();
  const [splashStartedAt] = useState(() => Date.now());

  const loadSnapshot = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      if (options.showLoading) {
        setIsLoading(true);
      }

      try {
        const response = await fetch('/api/dashboard', {
          cache: 'no-store'
        });

        if (response.status === 401) {
          const payload = (await response
            .json()
            .catch(() => null)) as AuthErrorPayload | null;
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
            initialTransactionsPage: nextSnapshot.initialTransactionsPage,
            monthDynamics: nextSnapshot.monthDynamics,
            summary: nextSnapshot.summary,
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
    },
    []
  );

  useEffect(() => {
    void loadSnapshot({ showLoading: true });

    const events = new EventSource('/api/events');
    events.addEventListener('money.updated', () => {
      void loadSnapshot();
    });

    return () => {
      events.close();
    };
  }, [loadSnapshot]);

  useEffect(() => {
    if (isLoading || !showSplash) {
      return;
    }

    const elapsed = Date.now() - splashStartedAt;
    const exitDelay = Math.max(0, 800 - elapsed);
    const hideTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, exitDelay);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [isLoading, showSplash, splashStartedAt]);

  const activeCategories = useMemo(
    () =>
      snapshot?.categories.filter((category) => category.status === 'ACTIVE') ??
      [],
    [snapshot?.categories]
  );
  const activeWallets = useMemo(
    () =>
      snapshot?.wallets.filter((wallet) => wallet.status === 'ACTIVE') ?? [],
    [snapshot?.wallets]
  );

  return {
    activeCategories,
    activeWallets,
    error,
    isLoading,
    loadSnapshot,
    setError,
    setSnapshot,
    showSplash,
    snapshot,
    user
  };
}
