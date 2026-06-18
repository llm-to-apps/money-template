'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionIcon, Menu } from '@mantine/core';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { locales } from '@/i18n/locales';

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('LocaleSwitcher');
  const [isUpdatingLocale, setIsUpdatingLocale] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function selectLocale(nextLocale: string) {
    setIsUpdatingLocale(true);
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: nextLocale })
    });
    startTransition(() => {
      router.refresh();
      setIsUpdatingLocale(false);
    });
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          aria-label={t('label')}
          title={t('label')}
          loading={isPending || isUpdatingLocale}
          variant="subtle"
        >
          <Languages size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {locales.map((item) => (
          <Menu.Item
            key={item}
            disabled={item === locale}
            onClick={() => selectLocale(item)}
          >
            {t(item)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
