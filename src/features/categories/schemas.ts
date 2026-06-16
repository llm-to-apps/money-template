import {
  readOptionalCategoryScope,
  readOptionalString,
  readRecordStatus,
  readRequiredString
} from '@/shared/schema';

export const listCategoriesInputSchema = {
  type: 'object',
  properties: {
    includeArchived: { type: 'boolean' },
    query: { type: 'string' },
    parentId: { type: 'string' },
    scope: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] }
  },
  additionalProperties: false
} as const;

export const createCategoryInputSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    parentId: { type: 'string' },
    color: { type: 'string' },
    scope: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] }
  },
  required: ['name'],
  additionalProperties: false
} as const;

export const updateCategoryInputSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    parentId: { type: 'string' },
    color: { type: 'string' },
    scope: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] }
  },
  required: ['id'],
  additionalProperties: false
} as const;

export const deleteCategoryInputSchema = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
  additionalProperties: false
} as const;

export type ListCategoriesInput = Record<string, unknown>;
export type CreateCategoryInput = Record<string, unknown>;
export type UpdateCategoryInput = Record<string, unknown>;
export type DeleteCategoryInput = { id?: unknown };

export function parseListCategoriesInput(input: ListCategoriesInput) {
  return {
    includeArchived: input.includeArchived === true,
    parentId: readOptionalString(input.parentId)?.trim() || null,
    query: readOptionalString(input.query)?.trim() || null,
    scope:
      input.scope === undefined ? null : readOptionalCategoryScope(input.scope)
  };
}

export function parseCreateCategoryInput(input: CreateCategoryInput) {
  return {
    color: readOptionalString(input.color)?.trim() || undefined,
    name: readRequiredString(input.name, 'name'),
    parentId: normalizeParentId(input.parentId),
    scope: readOptionalCategoryScope(input.scope)
  };
}

export function parseUpdateCategoryInput(input: UpdateCategoryInput) {
  const id = parseCategoryId(input);
  const parentId =
    input.parentId !== undefined
      ? normalizeParentId(input.parentId)
      : undefined;

  if (parentId === id) {
    throw new Error('category cannot be its own parent');
  }

  const data = {
    ...(input.name !== undefined
      ? { name: readRequiredString(input.name, 'name') }
      : {}),
    ...(parentId !== undefined ? { parentId } : {}),
    ...(input.color !== undefined
      ? { color: readRequiredString(input.color, 'color') }
      : {}),
    ...(input.scope !== undefined
      ? { scope: readOptionalCategoryScope(input.scope) ?? undefined }
      : {}),
    ...(input.status !== undefined
      ? { status: readRecordStatus(input.status) }
      : {})
  };

  if (Object.keys(data).length === 0) {
    throw new Error('at least one category field is required');
  }

  return { data, id };
}

export function parseCategoryId(input: DeleteCategoryInput) {
  return readRequiredString(input.id, 'id');
}

function normalizeParentId(value: unknown) {
  const parentId = readOptionalString(value)?.trim();

  return parentId && parentId !== 'none' ? parentId : null;
}
