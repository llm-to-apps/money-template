import 'server-only';

import { Prisma } from '@prisma/client';

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: { include: { parent: true } };
    wallet: true;
  };
}>;

export type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: { parent: true };
}>;

export function centsFromAmount(amount: number) {
  return Math.round(amount * 100);
}

export function serializeWallet(wallet: Prisma.WalletGetPayload<object>) {
  return {
    ...wallet,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString()
  };
}

export function serializeCategory(category: CategoryWithParent) {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    label: categoryLabel(category),
    parent: category.parent
      ? {
          ...category.parent,
          createdAt: category.parent.createdAt.toISOString(),
          updatedAt: category.parent.updatedAt.toISOString()
        }
      : null,
    updatedAt: category.updatedAt.toISOString()
  };
}

export function serializeTransaction(transaction: TransactionWithRelations) {
  return {
    ...transaction,
    category: serializeCategory(transaction.category),
    createdAt: transaction.createdAt.toISOString(),
    occurredAt: transaction.occurredAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    wallet: serializeWallet(transaction.wallet)
  };
}

export function categoryLabel(category: {
  name: string;
  parent?: { name: string } | null;
}) {
  return category.parent
    ? `${category.parent.name} / ${category.name}`
    : category.name;
}
