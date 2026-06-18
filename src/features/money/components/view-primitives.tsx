'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import {
  ActionIcon,
  Breadcrumbs,
  Button,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core';
import type { MantineTheme } from '@mantine/core';
import { ChevronRight, Home, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type {
  CategoryRecord,
  RecordStatus,
  WalletRecord
} from '@/shared/money-types';

export const categoryScopes = ['INCOME', 'EXPENSE', 'BOTH'];
export const desktopTableColumnQuery = (theme: MantineTheme) =>
  `(min-width: ${theme.breakpoints.sm})`;
export const colorSwatches = [
  '#059669',
  '#0a9f72',
  '#14b8a6',
  '#0891b2',
  '#0284c7',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#9333ea',
  '#db2777',
  '#e11d48',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#65a30d',
  '#475569'
];

export const homeCrumb = { href: '/', label: 'Money' };

export function ViewStack({ children }: { children: ReactNode }) {
  return <Stack>{children}</Stack>;
}

export function MoneyBreadcrumbs({
  items
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  const common = useTranslations('Common');

  return (
    <Breadcrumbs separator={<ChevronRight size={14} />}>
      {items.map((item, index) =>
        item.href && index !== items.length - 1 ? (
          <Button
            key={`${item.label}-${index}`}
            component={Link}
            href={item.href}
            variant="subtle"
            size="compact-sm"
            leftSection={item.href === '/' ? <Home size={15} /> : undefined}
          >
            {item.href === '/' ? common('home') : item.label}
          </Button>
        ) : (
          <Text key={`${item.label}-${index}`} c="dimmed">
            {item.label}
          </Text>
        )
      )}
    </Breadcrumbs>
  );
}

export function TablePanel({
  actionHref,
  actionLabel,
  children
}: {
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder shadow="sm" radius="md">
      <Group justify="flex-end" mb="md">
        <ActionIcon
          component={Link}
          href={actionHref}
          aria-label={actionLabel}
          title={actionLabel}
          size="lg"
          radius="md"
        >
          <Plus size={18} />
        </ActionIcon>
      </Group>
      {children}
    </Card>
  );
}

export function ColorDot({ color }: { color: string }) {
  return (
    <ThemeIcon
      aria-hidden="true"
      size={12}
      radius="xl"
      bg={color}
      variant="filled"
    />
  );
}

export function isActive<T extends { status: RecordStatus }>(item: T) {
  return item.status === 'ACTIVE';
}

export function walletOptions(wallets: WalletRecord[], selectedId: string) {
  return wallets
    .filter((wallet) => wallet.status === 'ACTIVE' || wallet.id === selectedId)
    .map((wallet) => ({ value: wallet.id, label: wallet.name }));
}

export function categoryOptions(
  categories: CategoryRecord[],
  selectedId: string
) {
  return categories
    .filter(
      (category) => category.status === 'ACTIVE' || category.id === selectedId
    )
    .map((category) => ({ value: category.id, label: category.label }));
}
