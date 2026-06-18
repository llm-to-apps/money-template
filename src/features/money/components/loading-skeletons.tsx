'use client';

import { Box, Card, Group, SimpleGrid, Skeleton, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';

import {
  homeCrumb,
  MoneyBreadcrumbs,
  TablePanel,
  ViewStack
} from '@/features/money/components/view-primitives';
import type { MoneyRouteMode, MoneyView } from '@/shared/money-types';

export function RouteSkeleton({
  routeMode,
  view
}: {
  routeMode: MoneyRouteMode;
  view: MoneyView;
}) {
  const common = useTranslations('Common');
  const navigation = useTranslations('Navigation');
  const transactions = useTranslations('Transactions');
  const wallets = useTranslations('Wallets');
  const categories = useTranslations('Categories');

  if (view === 'transactions') {
    return routeMode.action === 'list' ? (
      <ListRouteSkeleton
        actionHref="/transactions/new"
        actionLabel={transactions('add')}
        columns={5}
        label={navigation('transactions')}
      />
    ) : (
      <FormRouteSkeleton
        parentHref="/transactions"
        parentLabel={navigation('transactions')}
        title={common('edit')}
      />
    );
  }

  if (view === 'wallets') {
    return routeMode.action === 'list' ? (
      <ListRouteSkeleton
        actionHref="/wallets/new"
        actionLabel={wallets('add')}
        columns={4}
        label={navigation('wallets')}
      />
    ) : (
      <FormRouteSkeleton
        parentHref="/wallets"
        parentLabel={navigation('wallets')}
        title={common('edit')}
      />
    );
  }

  if (view === 'categories') {
    return routeMode.action === 'list' ? (
      <ListRouteSkeleton
        actionHref="/categories/new"
        actionLabel={categories('add')}
        columns={3}
        label={navigation('categories')}
      />
    ) : (
      <FormRouteSkeleton
        parentHref="/categories"
        parentLabel={navigation('categories')}
        title={common('edit')}
      />
    );
  }

  return <DashboardSkeleton />;
}

export function DashboardSkeleton() {
  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} withBorder shadow="sm" radius="md">
            <Skeleton h={16} w="42%" />
            <Skeleton h={28} w="64%" mt={10} />
            <Skeleton h={12} w="52%" mt={8} />
            <Skeleton h={48} mt="md" />
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <PanelListSkeleton titleWidth="28%" rows={4} />
        <ChartSkeleton titleWidth="38%" height={260} />
      </SimpleGrid>

      <ChartSkeleton titleWidth="32%" height={260} />
      <PanelListSkeleton titleWidth="34%" rows={6} />
    </Stack>
  );
}

export function FormSkeleton() {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Stack>
        <Group justify="flex-end">
          <Skeleton h={36} w={36} radius="md" />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {Array.from({ length: 5 }, (_, index) => (
            <Stack key={index} gap={6}>
              <Skeleton h={14} w="32%" />
              <Skeleton h={36} radius="md" />
            </Stack>
          ))}
        </SimpleGrid>
        <Stack gap={6}>
          <Skeleton h={14} w="20%" />
          <Skeleton h={36} radius="md" />
        </Stack>
        <Group mt="sm">
          <Skeleton h={36} w={72} radius="md" />
          <Skeleton h={36} w={82} radius="md" />
        </Group>
      </Stack>
    </Card>
  );
}

function FormRouteSkeleton({
  parentHref,
  parentLabel,
  title
}: {
  parentHref: string;
  parentLabel: string;
  title: string;
}) {
  return (
    <ViewStack>
      <MoneyBreadcrumbs
        items={[
          homeCrumb,
          { href: parentHref, label: parentLabel },
          { label: title }
        ]}
      />
      <FormSkeleton />
    </ViewStack>
  );
}

function ListRouteSkeleton({
  actionHref,
  actionLabel,
  columns,
  label
}: {
  actionHref: string;
  actionLabel: string;
  columns: number;
  label: string;
}) {
  return (
    <ViewStack>
      <MoneyBreadcrumbs items={[homeCrumb, { label }]} />
      <TablePanel actionHref={actionHref} actionLabel={actionLabel}>
        <TableSkeleton columns={columns} />
      </TablePanel>
    </ViewStack>
  );
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <Stack gap={0}>
      <Box
        style={{
          border: '1px solid var(--mantine-color-default-border)',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden'
        }}
      >
        <Skeleton h={42} radius={0} />
        {Array.from({ length: 8 }, (_, rowIndex) => (
          <Group
            key={rowIndex}
            gap="md"
            px="md"
            py="sm"
            wrap="nowrap"
            style={{
              borderTop: '1px solid var(--mantine-color-default-border)'
            }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                h={18}
                w={
                  columnIndex === 0
                    ? '30%'
                    : `${Math.max(12, 24 - columnIndex * 2)}%`
                }
              />
            ))}
          </Group>
        ))}
      </Box>
      <Group justify="space-between" mt="md">
        <Skeleton h={18} w={150} />
      </Group>
    </Stack>
  );
}

function ChartSkeleton({
  height,
  titleWidth
}: {
  height: number;
  titleWidth: string;
}) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Skeleton h={24} w={titleWidth} mb="md" />
      <Skeleton h={height} radius="md" />
    </Card>
  );
}

function PanelListSkeleton({
  rows,
  titleWidth
}: {
  rows: number;
  titleWidth: string;
}) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Skeleton h={24} w={titleWidth} mb="md" />
      <Stack gap="sm">
        {Array.from({ length: rows }, (_, index) => (
          <Group key={index} justify="space-between" wrap="nowrap">
            <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
              <Skeleton circle h={12} w={12} />
              <Box style={{ flex: 1 }}>
                <Skeleton h={18} w="48%" />
                <Skeleton h={14} w="70%" mt={8} />
              </Box>
            </Group>
            <Skeleton h={18} w={88} />
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
