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
import { useLocale, useTranslations } from 'next-intl';

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
  const locale = useLocale();
  const common = useTranslations('Common');
  const wallets = useTranslations('Wallets');

  return (
    <TablePanel actionHref="/wallets/new" actionLabel={wallets('add')}>
      <DataTable<WalletRecord>
        borderRadius="md"
        highlightOnHover
        idAccessor="id"
        minHeight={snapshot.wallets.length === 0 ? 140 : undefined}
        noRecordsText={wallets('empty')}
        onRowClick={({ record }) => router.push(`/wallets/${record.id}/edit`)}
        records={snapshot.wallets}
        withTableBorder
        columns={[
          {
            accessor: 'name',
            title: common('name'),
            render: (wallet) => (
              <Group gap="xs">
                <ColorDot color={wallet.color} />
                <Text fw={600}>{wallet.name}</Text>
                {wallet.status === 'ARCHIVED' ? (
                  <Badge variant="light" color="gray">
                    {common('archived')}
                  </Badge>
                ) : null}
              </Group>
            )
          },
          {
            accessor: 'comment',
            title: common('comment'),
            visibleMediaQuery: desktopTableColumnQuery,
            render: (wallet) => (
              <Text c="dimmed">{wallet.comment || common('noComment')}</Text>
            )
          },
          {
            accessor: 'currency',
            title: common('currency'),
            visibleMediaQuery: desktopTableColumnQuery
          },
          {
            accessor: 'balanceCents',
            noWrap: true,
            title: common('balance'),
            textAlign: 'right',
            render: (wallet) => (
              <Text fw={700}>{formatMoney(wallet.balanceCents, locale)}</Text>
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
  const common = useTranslations('Common');
  const wallets = useTranslations('Wallets');

  return (
    <FormCard
      isBusy={isManaging}
      actions={
        wallet && onDeleteWallet ? (
          <DeleteMenu
            label={wallets('actions')}
            itemLabel={wallets('delete')}
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
              label={common('name')}
              name="name"
              defaultValue={wallet?.name ?? ''}
              placeholder={wallets('namePlaceholder')}
              required
            />
            <TextInput
              label={common('comment')}
              name="comment"
              defaultValue={wallet?.comment ?? ''}
              placeholder={wallets('commentPlaceholder')}
            />
            <TextInput
              label={common('currency')}
              name="currency"
              defaultValue={wallet?.currency ?? 'USD'}
              required
            />
            <ColorInput
              label={common('color')}
              name="color"
              defaultValue={wallet?.color ?? '#059669'}
              swatches={colorSwatches}
            />
            <NumberInput
              label={wallets('initialBalance')}
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
