import { CategoryScope, RecordStatus, TransactionType } from '@prisma/client';
import { z } from 'zod';

export const optionalStringSchema = z
  .unknown()
  .transform((value) => (typeof value === 'string' && value ? value : null));

export const requiredStringSchema = (name: string) =>
  z.unknown().transform((value, ctx) => {
    const text = typeof value === 'string' ? value.trim() : '';

    if (!text) {
      ctx.addIssue({
        code: 'custom',
        message: `${name} is required`
      });

      return z.NEVER;
    }

    return text;
  });

export const numberSchema = z.unknown().transform((value) => {
  return typeof value === 'number' ? value : Number(value);
});

export const optionalNumberSchema = z.unknown().transform((value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return typeof value === 'number' ? value : Number(value);
});

export const positiveAmountSchema = z.unknown().transform((value, ctx) => {
  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'amount must be a positive number'
    });

    return z.NEVER;
  }

  return amount;
});

export const transactionTypeSchema = z.unknown().transform((value, ctx) => {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) {
    return value;
  }

  ctx.addIssue({
    code: 'custom',
    message: 'type must be INCOME or EXPENSE'
  });

  return z.NEVER;
});

export const categoryScopeSchema = z.unknown().transform((value, ctx) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (
    value === CategoryScope.INCOME ||
    value === CategoryScope.EXPENSE ||
    value === CategoryScope.BOTH
  ) {
    return value;
  }

  ctx.addIssue({
    code: 'custom',
    message: 'scope must be INCOME, EXPENSE, or BOTH'
  });

  return z.NEVER;
});

export const recordStatusSchema = z.unknown().transform((value, ctx) => {
  if (value === RecordStatus.ACTIVE || value === RecordStatus.ARCHIVED) {
    return value;
  }

  ctx.addIssue({
    code: 'custom',
    message: 'status must be ACTIVE or ARCHIVED'
  });

  return z.NEVER;
});

export function parseWithSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Invalid input');
  }

  return result.data;
}

export function readOptionalString(value: unknown) {
  return parseWithSchema(optionalStringSchema, value);
}

export function readRequiredString(value: unknown, name: string) {
  return parseWithSchema(requiredStringSchema(name), value);
}

export function readNumber(value: unknown) {
  return parseWithSchema(numberSchema, value);
}

export function readOptionalNumber(value: unknown) {
  return parseWithSchema(optionalNumberSchema, value);
}

export function readOptionalDate(value: unknown, name: string) {
  const dateValue = readOptionalString(value);

  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${name} must be a valid date string`);
  }

  return date;
}

export function readOptionalPositiveAmount(value: unknown, name: string) {
  const amount = readOptionalNumber(value);

  if (amount === null) {
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return amount;
}

export function readTransactionType(value: unknown) {
  return parseWithSchema(transactionTypeSchema, value);
}

export function readOptionalCategoryScope(value: unknown) {
  return parseWithSchema(categoryScopeSchema, value);
}

export function readRecordStatus(value: unknown) {
  return parseWithSchema(recordStatusSchema, value);
}

export function parseObjectInput(input: unknown) {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return input as Record<string, unknown>;
}
