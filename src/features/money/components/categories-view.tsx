'use client';

import { useRouter } from 'next/navigation';
import {
  Badge,
  ColorInput,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import {
  DeleteMenu,
  FormButtons,
  FormCard,
  StatusSwitch
} from '@/features/money/components/form-controls';
import {
  categoryScopes,
  ColorDot,
  colorSwatches,
  desktopTableColumnQuery,
  TablePanel
} from '@/features/money/components/view-primitives';
import type { CategoryRecord, MoneySnapshot } from '@/shared/money-types';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;

export function CategoriesList({ snapshot }: { snapshot: MoneySnapshot }) {
  const router = useRouter();
  const common = useTranslations('Common');
  const categories = useTranslations('Categories');

  return (
    <TablePanel actionHref="/categories/new" actionLabel={categories('add')}>
      <DataTable<CategoryRecord>
        borderRadius="md"
        highlightOnHover
        idAccessor="id"
        minHeight={snapshot.categories.length === 0 ? 140 : undefined}
        noRecordsText={categories('empty')}
        onRowClick={({ record }) =>
          router.push(`/categories/${record.id}/edit`)
        }
        records={snapshot.categories}
        withTableBorder
        columns={[
          {
            accessor: 'name',
            title: common('name'),
            render: (category) => (
              <Group gap="xs">
                <ColorDot color={category.color} />
                <Text fw={600}>{category.label}</Text>
                {category.status === 'ARCHIVED' ? (
                  <Badge variant="light" color="gray">
                    {common('archived')}
                  </Badge>
                ) : null}
              </Group>
            )
          },
          {
            accessor: 'parent.name',
            title: categories('parent'),
            visibleMediaQuery: desktopTableColumnQuery,
            render: (category) => (
              <Text c="dimmed">{category.parent?.name ?? '-'}</Text>
            )
          },
          {
            accessor: 'scope',
            title: common('scope'),
            render: (category) => category.scope.toLowerCase()
          }
        ]}
      />
    </TablePanel>
  );
}

export function CategoryForm({
  categories,
  category,
  isManaging,
  onDeleteCategory,
  onSubmit
}: {
  categories: CategoryRecord[];
  category?: CategoryRecord;
  isManaging: boolean;
  onDeleteCategory?: (categoryId: string) => void;
  onSubmit: MutationFormHandler;
}) {
  const common = useTranslations('Common');
  const categoriesText = useTranslations('Categories');
  const parents = categories.filter(
    (item) =>
      !item.parentId && item.status === 'ACTIVE' && item.id !== category?.id
  );

  return (
    <FormCard
      isBusy={isManaging}
      actions={
        category && onDeleteCategory ? (
          <DeleteMenu
            label={categoriesText('actions')}
            itemLabel={categoriesText('delete')}
            disabled={isManaging}
            onDelete={() => onDeleteCategory(category.id)}
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
              defaultValue={category?.name ?? ''}
              placeholder={categoriesText('namePlaceholder')}
              required
            />
            <Select
              label={categoriesText('parent')}
              hiddenInputProps={{ name: 'parentId' }}
              defaultValue={category?.parentId ?? 'none'}
              data={[
                { value: 'none', label: categoriesText('noParent') },
                ...parents.map((parent) => ({
                  value: parent.id,
                  label: parent.name
                }))
              ]}
            />
            <Select
              label={common('scope')}
              hiddenInputProps={{ name: 'scope' }}
              defaultValue={category?.scope ?? 'BOTH'}
              data={categoryScopes.map((scope) => ({
                value: scope,
                label: scope
              }))}
            />
            <ColorInput
              label={common('color')}
              name="color"
              defaultValue={category?.color ?? '#059669'}
              swatches={colorSwatches}
            />
          </SimpleGrid>
          {category ? <StatusSwitch status={category.status} /> : null}
          <FormButtons cancelHref="/categories" />
        </Stack>
      </form>
    </FormCard>
  );
}
