import 'server-only';

import { CategoryScope, RecordStatus } from '@prisma/client';

import { prisma } from '@/server/db';
import { readOptionalCategoryScope, readOptionalString } from '@/shared/schema';

export async function resolveWalletId(args: Record<string, unknown>) {
  const walletId = readOptionalString(args.walletId);

  if (walletId) {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });

    if (!wallet) {
      throw new Error('walletId does not exist');
    }

    return wallet.id;
  }

  const walletName = readOptionalString(args.walletName)?.trim();

  if (walletName) {
    const wallet = await prisma.wallet.upsert({
      where: { name: walletName },
      update: { status: RecordStatus.ACTIVE },
      create: { name: walletName }
    });

    return wallet.id;
  }

  return getDefaultWalletId();
}

export async function getDefaultWalletId() {
  const existing = await prisma.wallet.findFirst({
    where: { status: RecordStatus.ACTIVE },
    orderBy: { createdAt: 'asc' }
  });

  if (existing) {
    return existing.id;
  }

  const wallet = await prisma.wallet.create({
    data: {
      name: 'Main Card',
      color: '#059669'
    }
  });

  return wallet.id;
}

export async function resolveCategoryId(args: Record<string, unknown>) {
  const categoryId = readOptionalString(args.categoryId);

  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      throw new Error('categoryId does not exist');
    }

    return category.id;
  }

  const categoryName = readOptionalString(args.categoryName)?.trim();

  if (!categoryName) {
    throw new Error('categoryId or categoryName is required');
  }

  return upsertCategoryPath(categoryName, {
    color: readOptionalString(args.categoryColor)?.trim() || undefined,
    scope: readOptionalCategoryScope(args.scope)
  });
}

export async function upsertCategoryPath(
  categoryPath: string,
  options: {
    color?: string;
    scope?: CategoryScope | null;
    parentId?: string | null;
  } = {}
) {
  const parts = categoryPath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('category name is required');
  }

  let parentId = options.parentId ?? null;
  let categoryId = '';

  for (const [index, name] of parts.entries()) {
    const isLeaf = index === parts.length - 1;
    const existing = await prisma.category.findFirst({
      where: { name, parentId },
      orderBy: { createdAt: 'asc' }
    });

    const data = {
      ...(isLeaf && options.color ? { color: options.color } : {}),
      ...(isLeaf && options.scope ? { scope: options.scope } : {})
    };
    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { ...data, status: RecordStatus.ACTIVE }
        })
      : await prisma.category.create({
          data: {
            name,
            parentId,
            color: options.color ?? '#059669',
            scope: isLeaf
              ? (options.scope ?? CategoryScope.BOTH)
              : CategoryScope.BOTH
          }
        });

    categoryId = category.id;
    parentId = category.id;
  }

  return categoryId;
}
