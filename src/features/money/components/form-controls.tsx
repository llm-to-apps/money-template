'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  LoadingOverlay,
  Menu,
  Select,
  Switch
} from '@mantine/core';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { RecordStatus } from '@/shared/money-types';

export function TypeSelect({
  defaultValue = 'EXPENSE'
}: {
  defaultValue?: string;
}) {
  const common = useTranslations('Common');

  return (
    <Select
      label={common('type')}
      hiddenInputProps={{ name: 'type' }}
      defaultValue={defaultValue}
      data={[
        { value: 'EXPENSE', label: common('expense') },
        { value: 'INCOME', label: common('income') }
      ]}
      required
    />
  );
}

export function FormCard({
  actions,
  children,
  isBusy
}: {
  actions?: ReactNode;
  children: ReactNode;
  isBusy: boolean;
}) {
  return (
    <Card withBorder shadow="sm" radius="md" pos="relative">
      <LoadingOverlay visible={isBusy} zIndex={10} overlayProps={{ blur: 0 }} />
      {actions ? (
        <Group justify="flex-end" mb="sm">
          {actions}
        </Group>
      ) : null}
      {children}
    </Card>
  );
}

export function FormButtons({
  cancelHref,
  isSaving = false,
  saveDisabled = false
}: {
  cancelHref: string;
  isSaving?: boolean;
  saveDisabled?: boolean;
}) {
  const common = useTranslations('Common');

  return (
    <Group mt="sm">
      <Button type="submit" loading={isSaving} disabled={saveDisabled}>
        {common('save')}
      </Button>
      <Button component={Link} href={cancelHref} variant="default">
        {common('cancel')}
      </Button>
    </Group>
  );
}

export function DeleteMenu({
  disabled,
  itemLabel,
  label,
  onDelete
}: {
  disabled: boolean;
  itemLabel: string;
  label: string;
  onDelete: () => void;
}) {
  return (
    <Menu shadow="md" position="bottom-end">
      <Menu.Target>
        <ActionIcon
          aria-label={label}
          disabled={disabled}
          radius="md"
          variant="default"
        >
          <MoreHorizontal size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<Trash2 size={16} />}
          onClick={onDelete}
        >
          {itemLabel}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export function StatusSwitch({ status }: { status: RecordStatus }) {
  const common = useTranslations('Common');
  const forms = useTranslations('Forms');

  return (
    <Box>
      <input name="status" type="hidden" value="ACTIVE" />
      <Switch
        name="status"
        value="ARCHIVED"
        defaultChecked={status === 'ARCHIVED'}
        label={common('archived')}
        description={forms('archivedDescription')}
      />
    </Box>
  );
}
