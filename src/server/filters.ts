import 'server-only';

import { Prisma } from '@prisma/client';

import { resolveCategoryId, resolveWalletId } from '@/server/resolvers';
import { centsFromAmount } from '@/server/serializers';
import {
  readOptionalDate,
  readOptionalPositiveAmount,
  readOptionalString,
  readTransactionType
} from '@/shared/schema';

export async function buildTransactionWhere(args: Record<string, unknown>) {
  const type = args.type === undefined ? null : readTransactionType(args.type);
  const walletId =
    args.walletId !== undefined || args.walletName !== undefined
      ? await resolveWalletId(args)
      : null;
  const categoryId =
    args.categoryId !== undefined || args.categoryName !== undefined
      ? await resolveCategoryId(args)
      : null;
  const parentCategoryName = readOptionalString(
    args.parentCategoryName
  )?.trim();
  const parentCategoryId = readOptionalString(args.parentCategoryId)?.trim();
  const from = readOptionalDate(args.from, 'from');
  const to = readOptionalDate(args.to, 'to');
  const minAmount = readOptionalPositiveAmount(args.minAmount, 'minAmount');
  const maxAmount = readOptionalPositiveAmount(args.maxAmount, 'maxAmount');
  const query = readOptionalString(args.query)?.trim();

  if (from && to && from.getTime() > to.getTime()) {
    throw new Error('from must be before to');
  }
  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    throw new Error('minAmount must be less than or equal to maxAmount');
  }

  return {
    ...(type ? { type } : {}),
    ...(walletId ? { walletId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(parentCategoryId || parentCategoryName
      ? {
          category: {
            parent: {
              ...(parentCategoryId ? { id: parentCategoryId } : {}),
              ...(parentCategoryName
                ? { name: { contains: parentCategoryName } }
                : {})
            }
          }
        }
      : {}),
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {})
          }
        }
      : {}),
    ...(minAmount !== null || maxAmount !== null
      ? {
          amountCents: {
            ...(minAmount !== null ? { gte: centsFromAmount(minAmount) } : {}),
            ...(maxAmount !== null ? { lte: centsFromAmount(maxAmount) } : {})
          }
        }
      : {}),
    ...(query
      ? {
          OR: [
            { note: { contains: query } },
            { category: { name: { contains: query } } },
            { category: { parent: { name: { contains: query } } } },
            { wallet: { name: { contains: query } } }
          ]
        }
      : {})
  } satisfies Prisma.TransactionWhereInput;
}
