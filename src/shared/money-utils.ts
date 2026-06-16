import type {
  MoneyRouteMode,
  MoneySnapshot,
  MoneyView
} from '@/shared/money-types';

const UI_DELAY_MS = 250;

export function waitForUiDelay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, UI_DELAY_MS);
  });
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-US');
}

export function formatDateInputValue(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayDateInputValue() {
  return formatDateInputValue(new Date());
}

export function viewFromPathname(pathname: string): MoneyView {
  if (pathname.startsWith('/transactions')) {
    return 'transactions';
  }
  if (pathname.startsWith('/wallets')) {
    return 'wallets';
  }
  if (pathname.startsWith('/categories')) {
    return 'categories';
  }
  return 'dashboard';
}

export function routeModeFromPathname(pathname: string): MoneyRouteMode {
  const parts = pathname.split('/').filter(Boolean);

  if (parts[1] === 'new') {
    return { action: 'new' };
  }

  if (parts[2] === 'edit' && parts[1]) {
    return { action: 'edit', id: parts[1] };
  }

  return { action: 'list' };
}

export function getInitialMainCategoryId(
  categories: MoneySnapshot['categories'],
  defaultCategoryId: string
) {
  const defaultCategory = categories.find(
    (category) => category.id === defaultCategoryId
  );

  if (defaultCategory?.parentId) {
    return defaultCategory.parentId;
  }
  if (defaultCategory) {
    return defaultCategory.id;
  }

  return (
    categories.find((category) => !category.parentId)?.id ??
    categories[0]?.parentId ??
    categories[0]?.id ??
    ''
  );
}

export function getInitialSubcategoryId(
  categories: MoneySnapshot['categories'],
  defaultCategoryId: string,
  mainCategoryId: string
) {
  const defaultCategory = categories.find(
    (category) => category.id === defaultCategoryId
  );

  if (defaultCategory?.parentId === mainCategoryId) {
    return defaultCategory.id;
  }

  return (
    categories.find((category) => category.parentId === mainCategoryId)?.id ??
    ''
  );
}
