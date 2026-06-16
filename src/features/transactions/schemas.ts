import { z } from 'zod';

import {
  optionalNumberSchema,
  parseObjectInput,
  parseWithSchema,
  positiveAmountSchema,
  readOptionalString,
  readRequiredString,
  transactionTypeSchema
} from '@/shared/schema';

export const createTransactionInputSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
    amount: { type: 'number' },
    walletId: { type: 'string' },
    walletName: { type: 'string' },
    categoryId: { type: 'string' },
    categoryName: { type: 'string' },
    categoryColor: { type: 'string' },
    note: { type: 'string' },
    occurredAt: { type: 'string' }
  },
  required: ['type', 'amount'],
  additionalProperties: false
} as const;

export const listTransactionsInputSchema = {
  type: 'object',
  properties: {
    limit: { type: 'number' },
    cursor: { type: 'string' },
    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
    walletId: { type: 'string' },
    walletName: { type: 'string' },
    categoryId: { type: 'string' },
    categoryName: { type: 'string' },
    parentCategoryId: { type: 'string' },
    parentCategoryName: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    minAmount: { type: 'number' },
    maxAmount: { type: 'number' },
    query: { type: 'string' }
  },
  additionalProperties: false
} as const;

export const getTransactionInputSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
  additionalProperties: false
} as const;

export const updateTransactionInputSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
    amount: { type: 'number' },
    walletId: { type: 'string' },
    walletName: { type: 'string' },
    categoryId: { type: 'string' },
    categoryName: { type: 'string' },
    note: { type: 'string' },
    occurredAt: { type: 'string' }
  },
  required: ['id'],
  additionalProperties: false
} as const;

export const deleteTransactionInputSchema = getTransactionInputSchema;

export type CreateTransactionInput = Record<string, unknown>;
export type ListTransactionsInput = Record<string, unknown>;
export type UpdateTransactionInput = Record<string, unknown>;
export type DeleteTransactionInput = { id?: unknown };

const optionalTextSchema = z
  .unknown()
  .transform((value) => (typeof value === 'string' ? value : null));

export function parseCreateTransactionInput(input: CreateTransactionInput) {
  const data = parseObjectInput(input);
  const type = parseWithSchema(transactionTypeSchema, data.type);
  const amount = parseWithSchema(positiveAmountSchema, data.amount);
  const occurredAt = parseTransactionDate(data.occurredAt, {
    defaultToNow: true,
    fieldName: 'occurredAt'
  });

  return {
    amount,
    occurredAt,
    type,
    note: parseWithSchema(optionalTextSchema, data.note)?.trim() || null
  };
}

export function parseListTransactionsInput(input: ListTransactionsInput) {
  const data = parseObjectInput(input);
  const limitValue = parseWithSchema(optionalNumberSchema, data.limit);

  return {
    cursor: readOptionalString(data.cursor)?.trim() || null,
    limit: Math.min(Math.max(Math.round(limitValue ?? 12), 1), 50)
  };
}

export function parseTransactionId(input: DeleteTransactionInput) {
  return readRequiredString(input.id, 'id');
}

export function parseUpdateTransactionInput(input: UpdateTransactionInput) {
  const data = parseObjectInput(input);
  const id = parseTransactionId(data);
  const amount =
    data.amount === undefined
      ? undefined
      : parseWithSchema(positiveAmountSchema, data.amount);
  const type =
    data.type === undefined
      ? undefined
      : parseWithSchema(transactionTypeSchema, data.type);
  const occurredAt =
    data.occurredAt === undefined
      ? undefined
      : parseTransactionDate(data.occurredAt, {
          defaultToNow: false,
          fieldName: 'occurredAt'
        });
  const note =
    data.note === undefined
      ? undefined
      : parseWithSchema(optionalTextSchema, data.note)?.trim() || null;

  if (
    amount === undefined &&
    type === undefined &&
    occurredAt === undefined &&
    note === undefined &&
    data.walletId === undefined &&
    data.walletName === undefined &&
    data.categoryId === undefined &&
    data.categoryName === undefined
  ) {
    throw new Error('at least one transaction field is required');
  }

  return {
    amount,
    id,
    note,
    occurredAt,
    type
  };
}

function parseTransactionDate(
  value: unknown,
  options: { defaultToNow: boolean; fieldName: string }
) {
  const text = readOptionalString(value)?.trim();

  if (!text) {
    if (options.defaultToNow) {
      return new Date();
    }

    throw new Error(`${options.fieldName} must be a valid date string`);
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T12:00:00`
    : text;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${options.fieldName} must be a valid date string`);
  }

  return date;
}
