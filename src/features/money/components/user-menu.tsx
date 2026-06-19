'use client';

import { Avatar, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { ChevronDown, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function UserMenu({
  displayName,
  isEmbedded
}: {
  displayName: string;
  isEmbedded: boolean;
}) {
  const auth = useTranslations('Auth');
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <Menu
      position="bottom-end"
      shadow="md"
      transitionProps={{ transition: 'pop-top-right' }}
      width={260}
      withinPortal
    >
      <Menu.Target>
        <UnstyledButton
          aria-label={displayName}
          style={{
            borderRadius: 'var(--mantine-radius-md)',
            color: 'var(--mantine-color-text)',
            display: 'block',
            maxWidth: 'min(184px, 36vw)',
            padding: '6px 10px'
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <Avatar alt={displayName} radius="xl" size={20}>
              {initials}
            </Avatar>
            <Text
              component="span"
              fw={500}
              lh={1.35}
              size="sm"
              style={{ minWidth: 0 }}
              truncate
            >
              {displayName}
            </Text>
            <ChevronDown size={12} style={{ flex: '0 0 auto' }} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      {!isEmbedded ? (
        <Menu.Dropdown>
          <Menu.Label>{displayName}</Menu.Label>
          <form action="/api/auth/logout" method="post">
            <Menu.Item
              component="button"
              type="submit"
              color="red"
              leftSection={<LogOut size={16} />}
            >
              {auth('signOut')}
            </Menu.Item>
          </form>
        </Menu.Dropdown>
      ) : null}
    </Menu>
  );
}
