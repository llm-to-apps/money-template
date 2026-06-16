import { broadcastAppEvent } from '@/server/events';
import { prisma } from '@/server/db';
import { throwAppError } from '@/shared/result';
import {
  buildTransactionWhere,
  centsFromAmount,
  resolveCategoryId,
  resolveWalletId,
  serializeTransaction
} from '@/server/money';
import {
  type CreateTransactionInput,
  type DeleteTransactionInput,
  type ListTransactionsInput,
  type UpdateTransactionInput,
  parseCreateTransactionInput,
  parseListTransactionsInput,
  parseTransactionId,
  parseUpdateTransactionInput
} from './schemas';

const transactionInclude = {
  category: { include: { parent: true } },
  wallet: true
} as const;

export async function createMoneyTransaction(input: CreateTransactionInput) {
  const parsed = parseCreateTransactionInput(input);
  const [categoryId, walletId] = await Promise.all([
    resolveCategoryId(input as Record<string, unknown>),
    resolveWalletId(input as Record<string, unknown>)
  ]);
  const transaction = await prisma.transaction.create({
    data: {
      amountCents: centsFromAmount(parsed.amount),
      categoryId,
      note: parsed.note,
      occurredAt: parsed.occurredAt,
      type: parsed.type,
      walletId
    },
    include: transactionInclude
  });

  notify('transaction.created', { transactionId: transaction.id });

  return { transaction: serializeTransaction(transaction) };
}

export async function listMoneyTransactions(input: ListTransactionsInput) {
  const parsed = parseListTransactionsInput(input);
  const where = await buildTransactionWhere(input);
  const transactions = await prisma.transaction.findMany({
    include: transactionInclude,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    ...(parsed.cursor ? { cursor: { id: parsed.cursor }, skip: 1 } : {}),
    take: parsed.limit + 1,
    where
  });
  const visibleTransactions = transactions.slice(0, parsed.limit);
  const hasNextPage = transactions.length > parsed.limit;

  return {
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? (visibleTransactions.at(-1)?.id ?? null) : null
    },
    transactions: visibleTransactions.map(serializeTransaction)
  };
}

export async function getMoneyTransaction(input: DeleteTransactionInput) {
  const id = parseTransactionId(input);
  const transaction = await prisma.transaction.findUnique({
    include: transactionInclude,
    where: { id }
  });

  if (!transaction) {
    throwAppError('NOT_FOUND', 'transaction not found');
  }

  return { transaction: serializeTransaction(transaction) };
}

export async function updateMoneyTransaction(input: UpdateTransactionInput) {
  const parsed = parseUpdateTransactionInput(input);
  const data = {
    ...(parsed.type !== undefined ? { type: parsed.type } : {}),
    ...(parsed.amount !== undefined
      ? { amountCents: centsFromAmount(parsed.amount) }
      : {}),
    ...(input.walletId !== undefined || input.walletName !== undefined
      ? { walletId: await resolveWalletId(input as Record<string, unknown>) }
      : {}),
    ...(input.categoryId !== undefined || input.categoryName !== undefined
      ? {
          categoryId: await resolveCategoryId(input as Record<string, unknown>)
        }
      : {}),
    ...(parsed.note !== undefined ? { note: parsed.note } : {}),
    ...(parsed.occurredAt !== undefined
      ? { occurredAt: parsed.occurredAt }
      : {})
  };

  const transaction = await prisma.transaction
    .update({
      data,
      include: transactionInclude,
      where: { id: parsed.id }
    })
    .catch(mapNotFound('transaction not found'));

  notify('transaction.updated', { transactionId: transaction.id });

  return { transaction: serializeTransaction(transaction) };
}

export async function deleteMoneyTransaction(input: DeleteTransactionInput) {
  const id = parseTransactionId(input);
  const transaction = await prisma.transaction
    .delete({
      include: transactionInclude,
      where: { id }
    })
    .catch(mapNotFound('transaction not found'));

  notify('transaction.deleted', { transactionId: transaction.id });

  return { transaction: serializeTransaction(transaction) };
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
