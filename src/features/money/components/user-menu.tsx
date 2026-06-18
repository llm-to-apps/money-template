'use client';

import { Avatar, Button, Menu } from '@mantine/core';
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
        <Button
          leftSection={
            <Avatar alt={displayName} radius="xl" size={20}>
              {initials}
            </Avatar>
          }
          rightSection={<ChevronDown size={12} />}
          maw={{ base: 132, md: 184 }}
          variant="subtle"
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {displayName}
          </span>
        </Button>
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
