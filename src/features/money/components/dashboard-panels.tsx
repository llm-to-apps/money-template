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
  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">
        Wallets
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
      <Title order={2} size="h4" mb="md">
        Category spend
      </Title>
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

function TrendPanel({ snapshot }: { snapshot: MoneySnapshot }) {
  const data = snapshot.monthDynamics.map((month) => ({
    expenses: month.expensesCents,
    income: month.incomeCents,
    month: month.label
  }));

  return (
    <Card withBorder shadow="sm" radius="md">
      <Title order={2} size="h4" mb="md">
        Monthly dynamics
      </Title>
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
      <Title order={2} size="h4" mb="md">
        Recent transactions
      </Title>
      <Stack gap="sm">
        {snapshot.initialTransactionsPage.transactions.length === 0 ? (
          <Text c="dimmed">No transactions yet.</Text>
        ) : (
          snapshot.initialTransactionsPage.transactions
            .slice(0, 8)
            .map((transaction) => (
              <Group key={transaction.id} justify="space-between" wrap="nowrap">
                <Box>
                  <Text fw={600}>{transaction.category.label}</Text>
                  <Text c="dimmed">
                    {transaction.wallet.name} · {transaction.note || 'No note'}{' '}
                    · {formatDate(transaction.occurredAt)}
                  </Text>
                </Box>
                <Text
                  c={transaction.type === 'INCOME' ? 'green' : 'red'}
                  fw={700}
                >
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
