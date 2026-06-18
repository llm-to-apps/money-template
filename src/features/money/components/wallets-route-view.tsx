'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@mantine/core';
import { useTranslations } from 'next-intl';

import { FormSkeleton } from '@/features/money/components/loading-skeletons';
import {
  WalletForm,
  WalletsList
} from '@/features/money/components/wallets-view';
import {
  homeCrumb,
  MoneyBreadcrumbs,
  ViewStack
} from '@/features/money/components/view-primitives';
import type {
  MoneyRouteMode,
  MoneySnapshot,
  WalletRecord
} from '@/shared/money-types';
import type { ApiResponse } from '@/shared/api';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;

export function WalletsRouteView({
  isManaging,
  onCreateWallet,
  onDeleteWallet,
  onUpdateWallet,
  routeMode,
  snapshot
}: {
  isManaging: boolean;
  onCreateWallet: MutationFormHandler;
  onDeleteWallet: (walletId: string) => void;
  onUpdateWallet: (event: FormEvent<HTMLFormElement>, walletId: string) => void;
  routeMode: MoneyRouteMode;
  snapshot: MoneySnapshot;
}) {
  const common = useTranslations('Common');
  const navigation = useTranslations('Navigation');

  if (routeMode.action === 'new') {
    return (
      <ViewStack>
        <MoneyBreadcrumbs
          items={[
            homeCrumb,
            { href: '/wallets', label: navigation('wallets') },
            { label: common('add') }
          ]}
        />
        <WalletForm isManaging={isManaging} onSubmit={onCreateWallet} />
      </ViewStack>
    );
  }

  if (routeMode.action === 'edit') {
    return (
      <WalletEditView
        initialWallet={snapshot.wallets.find(
          (item) => item.id === routeMode.id
        )}
        isManaging={isManaging}
        onDeleteWallet={onDeleteWallet}
        onUpdateWallet={onUpdateWallet}
        walletId={routeMode.id}
      />
    );
  }

  return (
    <ViewStack>
      <MoneyBreadcrumbs items={[homeCrumb, { label: navigation('wallets') }]} />
      <WalletsList snapshot={snapshot} />
    </ViewStack>
  );
}

function WalletEditView({
  initialWallet,
  isManaging,
  onDeleteWallet,
  onUpdateWallet,
  walletId
}: {
  initialWallet: WalletRecord | undefined;
  isManaging: boolean;
  onDeleteWallet: (walletId: string) => void;
  onUpdateWallet: (event: FormEvent<HTMLFormElement>, walletId: string) => void;
  walletId: string;
}) {
  const common = useTranslations('Common');
  const navigation = useTranslations('Navigation');
  const walletsText = useTranslations('Wallets');
  const [wallet, setWallet] = useState<WalletRecord | null>(
    initialWallet ?? null
  );
  const [status, setStatus] = useState<'error' | 'idle' | 'loading'>(
    initialWallet ? 'idle' : 'loading'
  );

  useEffect(() => {
    setWallet(initialWallet ?? null);
    setStatus(initialWallet ? 'idle' : 'loading');

    if (initialWallet) {
      return;
    }

    let isCurrent = true;

    async function loadWallet() {
      try {
        const response = await fetch(`/api/wallets/${walletId}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('wallet not found');
        }

        const payload = (await response.json()) as ApiResponse<{
          wallet: WalletRecord;
        }>;

        if (!payload.ok) {
          throw new Error('wallet not found');
        }

        if (isCurrent) {
          setWallet(payload.data.wallet);
          setStatus('idle');
        }
      } catch {
        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    void loadWallet();

    return () => {
      isCurrent = false;
    };
  }, [initialWallet, walletId]);

  return (
    <ViewStack>
      <MoneyBreadcrumbs
        items={[
          homeCrumb,
          { href: '/wallets', label: navigation('wallets') },
          { label: wallet?.name ?? common('edit') }
        ]}
      />
      {wallet ? (
        <WalletForm
          isManaging={isManaging}
          onDeleteWallet={onDeleteWallet}
          onSubmit={(event) => onUpdateWallet(event, wallet.id)}
          wallet={wallet}
        />
      ) : status === 'error' ? (
        <Card withBorder>{walletsText('notFound')}</Card>
      ) : (
        <FormSkeleton />
      )}
    </ViewStack>
  );
}
