import {
  optionalNumberSchema,
  parseObjectInput,
  parseWithSchema,
  readNumber,
  readOptionalString,
  readRecordStatus,
  readRequiredString
} from '@/shared/schema';

export const listWalletsInputSchema = {
  type: 'object',
  properties: {
    includeArchived: { type: 'boolean' },
    query: { type: 'string' }
  },
  additionalProperties: false
} as const;

export const createWalletInputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    comment: { type: 'string' },
    currency: { type: 'string' },
    color: { type: 'string' },
    initialBalance: { type: 'number' }
  },
  required: ['name'],
  additionalProperties: false
} as const;

export const updateWalletInputSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    comment: { type: 'string' },
    currency: { type: 'string' },
    color: { type: 'string' },
    initialBalance: { type: 'number' },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] }
  },
  required: ['id'],
  additionalProperties: false
} as const;

export const deleteWalletInputSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
  additionalProperties: false
} as const;

export type ListWalletsInput = Record<string, unknown>;
export type CreateWalletInput = Record<string, unknown>;
export type UpdateWalletInput = Record<string, unknown>;
export type DeleteWalletInput = { id?: unknown };

export function parseListWalletsInput(input: ListWalletsInput) {
  const data = parseObjectInput(input);

  return {
    includeArchived: data.includeArchived === true,
    query: readOptionalString(data.query)?.trim() || null
  };
}

export function parseCreateWalletInput(input: CreateWalletInput) {
  const data = parseObjectInput(input);

  return {
    color: readOptionalString(data.color)?.trim() || '#059669',
    comment: readOptionalString(data.comment)?.trim() || null,
    currency: readOptionalString(data.currency)?.trim() || 'USD',
    initialBalance:
      parseWithSchema(optionalNumberSchema, data.initialBalance) ?? 0,
    name: readRequiredString(data.name, 'name')
  };
}

export function parseUpdateWalletInput(input: UpdateWalletInput) {
  const inputData = parseObjectInput(input);
  const id = parseWalletId(inputData);
  const data = {
    ...(inputData.name !== undefined
      ? { name: readRequiredString(inputData.name, 'name') }
      : {}),
    ...(inputData.comment !== undefined
      ? { comment: readOptionalString(inputData.comment)?.trim() || null }
      : {}),
    ...(inputData.currency !== undefined
      ? { currency: readRequiredString(inputData.currency, 'currency') }
      : {}),
    ...(inputData.color !== undefined
      ? { color: readRequiredString(inputData.color, 'color') }
      : {}),
    ...(inputData.initialBalance !== undefined
      ? { initialBalance: readNumber(inputData.initialBalance) }
      : {}),
    ...(inputData.status !== undefined
      ? { status: readRecordStatus(inputData.status) }
      : {})
  };

  if (Object.keys(data).length === 0) {
    throw new Error('at least one wallet field is required');
  }

  return { data, id };
}

export function parseWalletId(input: DeleteWalletInput) {
  return readRequiredString(input.id, 'id');
}
