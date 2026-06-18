'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card } from '@mantine/core';
import { useTranslations } from 'next-intl';

import { FormSkeleton } from '@/features/money/components/loading-skeletons';
import {
  CategoriesList,
  CategoryForm
} from '@/features/money/components/categories-view';
import {
  homeCrumb,
  MoneyBreadcrumbs,
  ViewStack
} from '@/features/money/components/view-primitives';
import type {
  CategoryRecord,
  MoneyRouteMode,
  MoneySnapshot
} from '@/shared/money-types';
import type { ApiResponse } from '@/shared/api';

type MutationFormHandler = (event: FormEvent<HTMLFormElement>) => void;

export function CategoriesRouteView({
  isManaging,
  onCreateCategory,
  onDeleteCategory,
  onUpdateCategory,
  routeMode,
  snapshot
}: {
  isManaging: boolean;
  onCreateCategory: MutationFormHandler;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateCategory: (
    event: FormEvent<HTMLFormElement>,
    categoryId: string
  ) => void;
  routeMode: MoneyRouteMode;
  snapshot: MoneySnapshot;
}) {
  const common = useTranslations('Common');
  const navigation = useTranslations('Navigation');

  if (routeMode.action === 'new') {
    return (
      <ViewStack>
        <MoneyBreadcrumbs
          items={[
            homeCrumb,
            { href: '/categories', label: navigation('categories') },
            { label: common('add') }
          ]}
        />
        <CategoryForm
          categories={snapshot.categories}
          isManaging={isManaging}
          onSubmit={onCreateCategory}
        />
      </ViewStack>
    );
  }

  if (routeMode.action === 'edit') {
    return (
      <CategoryEditView
        categories={snapshot.categories}
        categoryId={routeMode.id}
        initialCategory={snapshot.categories.find(
          (item) => item.id === routeMode.id
        )}
        isManaging={isManaging}
        onDeleteCategory={onDeleteCategory}
        onUpdateCategory={onUpdateCategory}
      />
    );
  }

  return (
    <ViewStack>
      <MoneyBreadcrumbs
        items={[homeCrumb, { label: navigation('categories') }]}
      />
      <CategoriesList snapshot={snapshot} />
    </ViewStack>
  );
}

function CategoryEditView({
  categories,
  categoryId,
  initialCategory,
  isManaging,
  onDeleteCategory,
  onUpdateCategory
}: {
  categories: CategoryRecord[];
  categoryId: string;
  initialCategory: CategoryRecord | undefined;
  isManaging: boolean;
  onDeleteCategory: (categoryId: string) => void;
  onUpdateCategory: (
    event: FormEvent<HTMLFormElement>,
    categoryId: string
  ) => void;
}) {
  const common = useTranslations('Common');
  const navigation = useTranslations('Navigation');
  const categoriesText = useTranslations('Categories');
  const [category, setCategory] = useState<CategoryRecord | null>(
    initialCategory ?? null
  );
  const [status, setStatus] = useState<'error' | 'idle' | 'loading'>(
    initialCategory ? 'idle' : 'loading'
  );

  useEffect(() => {
    setCategory(initialCategory ?? null);
    setStatus(initialCategory ? 'idle' : 'loading');

    if (initialCategory) {
      return;
    }

    let isCurrent = true;

    async function loadCategory() {
      try {
        const response = await fetch(`/api/categories/${categoryId}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('category not found');
        }

        const payload = (await response.json()) as ApiResponse<{
          category: CategoryRecord;
        }>;

        if (!payload.ok) {
          throw new Error('category not found');
        }

        if (isCurrent) {
          setCategory(payload.data.category);
          setStatus('idle');
        }
      } catch {
        if (isCurrent) {
          setStatus('error');
        }
      }
    }

    void loadCategory();

    return () => {
      isCurrent = false;
    };
  }, [categoryId, initialCategory]);

  return (
    <ViewStack>
      <MoneyBreadcrumbs
        items={[
          homeCrumb,
          { href: '/categories', label: navigation('categories') },
          { label: category?.label ?? common('edit') }
        ]}
      />
      {category ? (
        <CategoryForm
          categories={categories}
          category={category}
          isManaging={isManaging}
          onDeleteCategory={onDeleteCategory}
          onSubmit={(event) => onUpdateCategory(event, category.id)}
        />
      ) : status === 'error' ? (
        <Card withBorder>{categoriesText('notFound')}</Card>
      ) : (
        <FormSkeleton />
      )}
    </ViewStack>
  );
}
