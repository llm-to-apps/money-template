'use client';

import { useRouter } from 'next/navigation';
import {
  Badge,
  ColorInput,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { FormEvent } from 'react';

import {
  DeleteMenu,
  FormButtons,
  FormCard,
  StatusSwitch
} from '@/features/money/components/form-controls';
import {
  ColorDot,
  colorSwatches,
  desktopTableColumnQuery,
  TablePanel
} from '@/features/money/components/view-primitives';
import type { MoneySnapshot, WalletRecord } from '@/shared/money-types';
import { formatMoney } from '@/shared/money-utils';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;

export function WalletsList({ snapshot }: { snapshot: MoneySnapshot }) {
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
                {wallet.status === 'ARCHIVED' ? (
                  <Badge variant="light" color="gray">
                    Archived
                  </Badge>
                ) : null}
              </Group>
            )
          },
          {
            accessor: 'comment',
            title: 'Comment',
            visibleMediaQuery: desktopTableColumnQuery,
            render: (wallet) => (
              <Text c="dimmed">{wallet.comment || 'No comment'}</Text>
            )
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
            render: (wallet) => (
              <Text fw={700}>{formatMoney(wallet.balanceCents)}</Text>
            )
          }
        ]}
      />
    </TablePanel>
  );
}

export function WalletForm({
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
      actions={
        wallet && onDeleteWallet ? (
          <DeleteMenu
            label="Wallet actions"
            itemLabel="Delete wallet"
            disabled={isManaging}
            onDelete={() => onDeleteWallet(wallet.id)}
          />
        ) : null
      }
    >
      <form onSubmit={onSubmit}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Name"
              name="name"
              defaultValue={wallet?.name ?? ''}
              placeholder="Wallet name"
              required
            />
            <TextInput
              label="Comment"
              name="comment"
              defaultValue={wallet?.comment ?? ''}
              placeholder="Card, cash, bank account"
            />
            <TextInput
              label="Currency"
              name="currency"
              defaultValue={wallet?.currency ?? 'USD'}
              required
            />
            <ColorInput
              label="Color"
              name="color"
              defaultValue={wallet?.color ?? '#059669'}
              swatches={colorSwatches}
            />
            <NumberInput
              label="Initial balance"
              name="initialBalance"
              defaultValue={wallet ? wallet.initialBalanceCents / 100 : 0}
              step={0.01}
            />
          </SimpleGrid>
          {wallet ? <StatusSwitch status={wallet.status} /> : null}
          <FormButtons cancelHref="/wallets" />
        </Stack>
      </form>
    </FormCard>
  );
}
