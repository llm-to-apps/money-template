'use client';

import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title
} from '@mantine/core';
import { BarChart, Sparkline } from '@mantine/charts';
import { useLocale, useTranslations } from 'next-intl';

import { ColorDot } from '@/features/money/components/view-primitives';
import type { MoneySnapshot } from '@/shared/money-types';
import { formatDate, formatMoney } from '@/shared/money-utils';

export function DashboardPanels({ snapshot }: { snapshot: MoneySnapshot }) {
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

function SummaryCards({ snapshot }: { snapshot: MoneySnapshot }) {
  const locale = useLocale();
  const dashboard = useTranslations('Dashboard');

  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }}>
      <StatCard
        label={dashboard('balance')}
        value={formatMoney(snapshot.summary.balanceCents, locale)}
        color={snapshot.summary.balanceCents >= 0 ? 'green' : 'red'}
        trend={snapshot.monthDynamics.map((month) => month.balanceCents)}
      />
      <StatCard
        label={dashboard('thisMonth')}
        value={formatMoney(snapshot.summary.currentMonth.incomeCents, locale)}
        color="green"
        description={dashboard('net', {
          amount: formatMoney(
            snapshot.summary.currentMonth.balanceCents,
            locale
          )
        })}
        trend={snapshot.monthDynamics.map((month) => month.incomeCents)}
      />
      <StatCard
        label={dashboard('monthExpenses')}
        value={formatMoney(snapshot.summary.currentMonth.expensesCents, locale)}
        color="red"
        description={dashboard('previous', {
          amount: formatMoney(
            snapshot.summary.previousMonth.expensesCents,
            locale
          )
        })}
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
      <Text mt={6} fw={700} size="xl" c={color}>
        {value}
      </Text>
      {description ? (
        <Text mt={4} size="xs" c="dimmed">
          {description}
        </Text>
      ) : null}
      <Sparkline
        mt="md"
        h={48}
        data={trend.map((value) => value / 100)}
        trendColors={{
          positive: 'green.6',
          negative: 'red.6',
          neutral: 'gray.5'
        }}
        fillOpacity={0.16}
        curveType="natural"
      />
    </Card>
  );
}

function WalletsPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const locale = useLocale();
  const dashboard = useTranslations('Dashboard');

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">
        {dashboard('wallets')}
      </Title>
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
            <Text fw={700}>
              {formatMoney(wallet.balanceCents, locale, wallet.currency)}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function CategorySpendPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const locale = useLocale();
  const common = useTranslations('Common');
  const dashboard = useTranslations('Dashboard');
  const data = snapshot.categoryBreakdown.slice(0, 8).map((category) => ({
    amount: category.amountCents,
    category: category.label
  }));

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">
        {dashboard('categorySpend')}
      </Title>
      {data.length === 0 ? (
        <Text c="dimmed">{dashboard('noExpensesThisMonth')}</Text>
      ) : (
        <ChartFrame height={Math.max(260, data.length * 44)}>
          <BarChart
            h="100%"
            data={data}
            dataKey="category"
            gridAxis="x"
            orientation="vertical"
            series={[
              { name: 'amount', label: common('amount'), color: 'blue.6' }
            ]}
            tickLine="none"
            valueFormatter={(value) => formatMoney(value, locale)}
            withTooltip
            xAxisProps={{
              tickFormatter: (value) => formatMoney(Number(value), locale)
            }}
            yAxisProps={{ width: 128 }}
          />
        </ChartFrame>
      )}
    </Card>
  );
}

function TrendPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const locale = useLocale();
  const common = useTranslations('Common');
  const dashboard = useTranslations('Dashboard');
  const data = snapshot.monthDynamics.map((month) => ({
    expenses: month.expensesCents,
    income: month.incomeCents,
    month: month.label
  }));

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">
        {dashboard('monthlyDynamics')}
      </Title>
      <ChartFrame height={260}>
        <BarChart
          h="100%"
          data={data}
          dataKey="month"
          series={[
            { name: 'income', label: common('income'), color: 'green.6' },
            { name: 'expenses', label: common('expenses'), color: 'red.6' }
          ]}
          valueFormatter={(value) => formatMoney(value, locale)}
          tickLine="y"
          gridAxis="y"
          withLegend
        />
      </ChartFrame>
    </Card>
  );
}

function ChartFrame({
  children,
  height
}: {
  children: React.ReactNode;
  height: number;
}) {
  return (
    <Box h={height} miw={0} w="100%" style={{ overflow: 'hidden' }}>
      {children}
    </Box>
  );
}

function TransactionsPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const locale = useLocale();
  const common = useTranslations('Common');
  const dashboard = useTranslations('Dashboard');

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">
        {dashboard('recentTransactions')}
      </Title>
      <Stack gap="sm">
        {snapshot.initialTransactionsPage.transactions.length === 0 ? (
          <Text c="dimmed">{dashboard('noTransactionsYet')}</Text>
        ) : (
          snapshot.initialTransactionsPage.transactions
            .slice(0, 8)
            .map((transaction) => (
              <Group key={transaction.id} justify="space-between" wrap="nowrap">
                <Box>
                  <Text fw={600}>{transaction.category.label}</Text>
                  <Text c="dimmed">
                    {transaction.wallet.name} ·{' '}
                    {transaction.note || common('noNote')} ·{' '}
                    {formatDate(transaction.occurredAt, locale)}
                  </Text>
                </Box>
                <Text
                  c={transaction.type === 'INCOME' ? 'green' : 'red'}
                  fw={700}
                >
                  {transaction.type === 'INCOME' ? '+' : '-'}
                  {formatMoney(
                    transaction.amountCents,
                    locale,
                    transaction.wallet.currency
                  )}
                </Text>
              </Group>
            ))
        )}
      </Stack>
    </Card>
  );
}
