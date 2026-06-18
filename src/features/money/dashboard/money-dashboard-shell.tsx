'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import {
  AppShell,
  Badge,
  Box,
  Burger,
  Container,
  Group,
  NavLink,
  Stack,
  Text
} from '@mantine/core';
import { LayoutDashboard, ReceiptText, Tags, WalletCards } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Os7Logo, os7Brand } from '@os7/ui-kit/os7-brand';

import { LocaleSwitcher } from '@/features/money/components/locale-switcher';
import { UserMenu } from '@/features/money/components/user-menu';
import type { MoneyView } from '@/shared/money-types';

type MoneyDashboardShellProps = {
  children: ReactNode;
  currentView: MoneyView;
  displayName: string;
  isEmbedded: boolean;
  isLocaleLocked: boolean;
  mobileNavOpened: boolean;
  onCloseMobileNav: () => void;
  onToggleMobileNav: () => void;
};

export function MoneyDashboardShell({
  children,
  currentView,
  displayName,
  isEmbedded,
  isLocaleLocked,
  mobileNavOpened,
  onCloseMobileNav,
  onToggleMobileNav
}: MoneyDashboardShellProps) {
  const navigation = useTranslations('Navigation');
  const shell = useTranslations('Shell');
  const app = useTranslations('App');

  const moneyNavItems = getMoneyNavItems({
    categories: navigation('categories'),
    dashboard: navigation('dashboard'),
    transactions: navigation('transactions'),
    wallets: navigation('wallets')
  });

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { desktop: true, mobile: !mobileNavOpened }
      }}
      footer={{ height: 44, offset: false }}
      padding="md"
    >
      <AppShell.Header>
        <Container h="100%">
          <Box
            h="100%"
            style={{
              alignItems: 'center',
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'auto minmax(0, 1fr) auto'
            }}
          >
            <Group gap="sm" h="100%" wrap="nowrap">
              <Burger
                opened={mobileNavOpened}
                onClick={onToggleMobileNav}
                hiddenFrom="sm"
                size="sm"
                aria-label={shell('openNavigation')}
              />
              <Badge radius="md" size="lg" variant="outline">
                {app('name')}
              </Badge>
            </Group>

            <Box
              h="100%"
              visibleFrom="sm"
              style={{ minWidth: 0, overflow: 'hidden' }}
            >
              <Group
                gap={4}
                h="100%"
                justify="center"
                wrap="nowrap"
                style={{
                  minWidth: 0,
                  overflowX: 'auto',
                  scrollbarWidth: 'none'
                }}
              >
                {moneyNavItems.map((item) => (
                  <NavLink
                    key={item.href}
                    component={Link}
                    href={item.href}
                    active={item.view === currentView}
                    label={item.label}
                    leftSection={item.icon}
                    w="auto"
                    px="sm"
                    style={{ flex: '0 0 auto' }}
                  />
                ))}
              </Group>
            </Box>

            <Group h="100%" justify="flex-end" wrap="nowrap">
              {!isLocaleLocked ? <LocaleSwitcher /> : null}
              <UserMenu displayName={displayName} isEmbedded={isEmbedded} />
            </Group>
          </Box>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="sm">
          {moneyNavItems.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              active={item.view === currentView}
              label={item.label}
              leftSection={item.icon}
              onClick={onCloseMobileNav}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container>{children}</Container>
      </AppShell.Main>

      <AppShell.Footer pos="static">
        <Container h="100%">
          <Group h="100%" justify="space-between">
            <Text size="xs" c="dimmed">
              {shell('footer')}
            </Text>
            <Os7Logo h={18} href={os7Brand.siteHref} target="_blank" />
          </Group>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}

function getMoneyNavItems(labels: {
  categories: string;
  dashboard: string;
  transactions: string;
  wallets: string;
}): Array<{
  href: string;
  icon: ReactNode;
  label: string;
  view: MoneyView;
}> {
  return [
    {
      href: '/',
      icon: <LayoutDashboard size={16} />,
      label: labels.dashboard,
      view: 'dashboard'
    },
    {
      href: '/transactions',
      icon: <ReceiptText size={16} />,
      label: labels.transactions,
      view: 'transactions'
    },
    {
      href: '/wallets',
      icon: <WalletCards size={16} />,
      label: labels.wallets,
      view: 'wallets'
    },
    {
      href: '/categories',
      icon: <Tags size={16} />,
      label: labels.categories,
      view: 'categories'
    }
  ];
}
