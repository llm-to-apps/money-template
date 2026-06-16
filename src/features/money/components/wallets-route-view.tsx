'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@mantine/core';

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
  if (routeMode.action === 'new') {
    return (
      <ViewStack>
        <MoneyBreadcrumbs
          items={[
            homeCrumb,
            { href: '/wallets', label: 'Wallets' },
            { label: 'Add' }
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
      <MoneyBreadcrumbs items={[homeCrumb, { label: 'Wallets' }]} />
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

        const payload = (await response.json()) as { wallet: WalletRecord };

        if (isCurrent) {
          setWallet(payload.wallet);
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
          { href: '/wallets', label: 'Wallets' },
          { label: wallet?.name ?? 'Edit' }
        ]}
      />
      {wallet ? (
        <WalletForm
          isManaging={isManaging}
          onDeleteWallet={onDeleteWallet}
          onSubmit={(event) => onUpdateWallet(event, wallet.id)}
          wallet={wallet}
        />
      ) : (
        <Card withBorder>
          {status === 'loading' ? 'Loading wallet...' : 'Wallet not found.'}
        </Card>
      )}
    </ViewStack>
  );
}
