import { broadcastAppEvent } from '@/server/events';
import { serializeCategory, upsertCategoryPath } from '@/server/money';
import { prisma } from '@/server/db';
import { throwAppError } from '@/shared/result';
import {
  type CreateCategoryInput,
  type DeleteCategoryInput,
  type ListCategoriesInput,
  type UpdateCategoryInput,
  parseCategoryId,
  parseCreateCategoryInput,
  parseListCategoriesInput,
  parseUpdateCategoryInput
} from './schemas';

export async function listMoneyCategories(input: ListCategoriesInput) {
  const parsed = parseListCategoriesInput(input);
  const categories = await prisma.category.findMany({
    include: { parent: true },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    where: {
      ...(parsed.includeArchived ? {} : { status: 'ACTIVE' }),
      ...(parsed.parentId ? { parentId: parsed.parentId } : {}),
      ...(parsed.scope ? { scope: parsed.scope } : {}),
      ...(parsed.query
        ? {
            OR: [
              { name: { contains: parsed.query } },
              { parent: { name: { contains: parsed.query } } }
            ]
          }
        : {})
    }
  });

  return { categories: categories.map(serializeCategory) };
}

export async function createMoneyCategory(input: CreateCategoryInput) {
  const parsed = parseCreateCategoryInput(input);
  const categoryId = await upsertCategoryPath(parsed.name, {
    color: parsed.color,
    parentId: parsed.parentId,
    scope: parsed.scope
  });
  const category = await prisma.category.findUniqueOrThrow({
    include: { parent: true },
    where: { id: categoryId }
  });

  notify('category.upserted', { categoryId: category.id });

  return { category: serializeCategory(category) };
}

export async function getMoneyCategory(input: DeleteCategoryInput) {
  const id = parseCategoryId(input);
  const category = await prisma.category.findUnique({
    include: { parent: true },
    where: { id }
  });

  if (!category) {
    throwAppError('NOT_FOUND', 'category not found');
  }

  return { category: serializeCategory(category) };
}

export async function updateMoneyCategory(input: UpdateCategoryInput) {
  const parsed = parseUpdateCategoryInput(input);
  const category = await prisma.category
    .update({
      data: parsed.data,
      include: { parent: true },
      where: { id: parsed.id }
    })
    .catch(mapNotFound('category not found'));

  notify('category.updated', { categoryId: category.id });

  return { category: serializeCategory(category) };
}

export async function deleteMoneyCategory(input: DeleteCategoryInput) {
  const id = parseCategoryId(input);
  const [transactionCount, childCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } })
  ]);

  if (transactionCount > 0 || childCount > 0) {
    throwAppError(
      'CONFLICT',
      'Category has transactions or subcategories. Change it with updateCategory status=ARCHIVED, or move/delete related records first.'
    );
  }

  const category = await prisma.category
    .delete({ include: { parent: true }, where: { id } })
    .catch(mapNotFound('category not found'));

  notify('category.deleted', { categoryId: category.id });

  return { category: serializeCategory(category) };
}

function notify(action: string, payload: Record<string, unknown>) {
  broadcastAppEvent({
    type: 'money.updated',
    payload: { action, ...payload }
  });
}

function mapNotFound(message: string) {
  return (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      throwAppError('NOT_FOUND', message);
    }

    throw error;
  };
}
