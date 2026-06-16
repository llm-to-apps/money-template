import { NextRequest, NextResponse } from 'next/server';

import { broadcastAppEvent } from '../../lib/events';
import { prisma } from '../../lib/db';
import {
  buildTransactionWhere,
  centsFromAmount,
  getMoneySnapshot,
  readNumber,
  readOptionalCategoryScope,
  readOptionalNumber,
  readOptionalString,
  readRecordStatus,
  readRequiredString,
  readTransactionType,
  resolveCategoryId,
  resolveWalletId,
  serializeCategory,
  serializeTransaction,
  serializeWallet,
  upsertCategoryPath
} from '../../lib/money';
import {
  isLocalAuthMode,
  moneyDevMcpToken,
  os7RequestHostHeader,
  projectId,
  projectTokenIntrospectionUrl
} from '../../lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
  tool?: string;
  arguments?: Record<string, unknown>;
};

const tools = [
  {
    name: 'listWallets',
    description:
      'List Money wallets with compact balances and archive status. Use walletId or walletName from this tool when creating or filtering transactions. Default includes active wallets; pass includeArchived=true only when historical or cleanup work needs it.',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: { type: 'boolean' },
        query: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'createWallet',
    description:
      'Create a Money wallet. name is required. comment is optional free-form text for details such as card, cash, bank account, or usage notes. initialBalance is a decimal major-unit amount. This mutation refreshes the Money UI.',
    inputSchema: {
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
    }
  },
  {
    name: 'updateWallet',
    description:
      'Update one Money wallet by id. Only pass fields to change. Use this for renaming, changing comment/color/currency, adjusting initial balance, or setting status to ACTIVE or ARCHIVED when an account/card is closed but history must stay visible.',
    inputSchema: {
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
    }
  },
  {
    name: 'deleteWallet',
    description:
      'Delete a wallet by id only when it has no transactions. If it has transactions, this returns an error; use updateWallet with status=ARCHIVED to hide a closed account while keeping historical reports valid. This mutation refreshes the Money UI.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'listCategories',
    description:
      'List Money categories and subcategories with labels like "Car / Fuel". Use categoryId or categoryName from this tool when creating or filtering transactions. Pass includeArchived=true only when cleanup work needs archived categories.',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: { type: 'boolean' },
        query: { type: 'string' },
        parentId: { type: 'string' },
        scope: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] }
      },
      additionalProperties: false
    }
  },
  {
    name: 'createCategory',
    description:
      'Create a category or subcategory. name can be a path such as "Car / Fuel"; Money will create missing parents. scope can be INCOME, EXPENSE, or BOTH. This mutation refreshes the Money UI.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        parentId: { type: 'string' },
        color: { type: 'string' },
        scope: { type: 'string', enum: ['INCOME', 'EXPENSE', 'BOTH'] }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  {
    name: 'updateCategory',
    description:
      'Update one category by id. Only pass fields to change. parentId can move a category under a parent. Set status to ACTIVE or ARCHIVED without deleting historical transactions. This mutation refreshes the Money UI.',
    inputSchema: {
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
    }
  },
  {
    name: 'deleteCategory',
    description:
      'Delete a category by id only when it has no transactions and no children. If it is used, this returns an error; use updateCategory with status=ARCHIVED to hide it while keeping historical reports valid. This mutation refreshes the Money UI.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'createTransaction',
    description:
      'Create one Money transaction. type must be INCOME or EXPENSE. amount is a decimal major-unit value. Provide walletId or walletName; provide categoryId or categoryName. categoryName may be a path like "Car / Fuel" and will create missing categories. occurredAt is optional ISO/date string and defaults to now. This mutation refreshes the Money UI.',
    inputSchema: {
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
    }
  },
  {
    name: 'listTransactions',
    description:
      'List or search Money transactions with bounded results. Supports filters by type, walletId/walletName, categoryId/categoryName, parentCategoryId/parentCategoryName, from/to date range, minAmount/maxAmount, and text query over note/category/wallet. Default limit is 12, max limit is 50. Use filters instead of broad datasets.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
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
    }
  },
  {
    name: 'getTransaction',
    description:
      'Get one Money transaction by id. Use this after listTransactions when you need a complete business object.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'updateTransaction',
    description:
      'Update one Money transaction by id. Only pass fields that should change. Supports walletId/walletName and categoryId/categoryName. categoryName may be a path like "Car / Repair". This mutation refreshes the Money UI.',
    inputSchema: {
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
    }
  },
  {
    name: 'deleteTransaction',
    description:
      'Delete one Money transaction by id. Use listTransactions first if the user identified the transaction by description rather than id. This mutation refreshes the Money UI.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'getSummary',
    description:
      'Return compact Money dashboard data: totals, current and previous month summary, wallet balances, category breakdown, and month dynamics. Use this instead of listing many transactions.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'listExpenseCategories',
    description:
      'Compatibility alias for listCategories. Prefer listCategories for new work because Money now supports income, expense, and nested categories.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'addExpenseCategory',
    description:
      'Compatibility alias for createCategory. Prefer createCategory for new work because Money now supports nested categories and scopes.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' }
      },
      required: ['name'],
      additionalProperties: false
    }
  }
];

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ tools });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as JsonRpcRequest;
  const id = body.id ?? null;

  if (body.method === 'tools/list') {
    return jsonRpcResult(id, { tools });
  }

  const toolName = body.params?.name ?? body.tool;
  const args = body.params?.arguments ?? body.arguments ?? {};

  if (body.method === 'tools/call' || body.tool) {
    try {
      const result = await callTool(toolName, args);

      return jsonRpcResult(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool failed';

      return jsonRpcError(id, -32000, message);
    }
  }

  return jsonRpcError(id, -32601, 'Method not found');
}

async function callTool(toolName: string | undefined, args: Record<string, unknown>) {
  switch (toolName) {
    case 'listWallets':
      return listWallets(args);
    case 'createWallet':
      return createWallet(args);
    case 'updateWallet':
      return updateWallet(args);
    case 'deleteWallet':
      return deleteWallet(args);
    case 'listCategories':
    case 'listExpenseCategories':
      return listCategories(args);
    case 'createCategory':
    case 'addExpenseCategory':
      return createCategory(args);
    case 'updateCategory':
      return updateCategory(args);
    case 'deleteCategory':
      return deleteCategory(args);
    case 'createTransaction':
      return createTransaction(args);
    case 'listTransactions':
      return listTransactions(args);
    case 'getTransaction':
      return getTransaction(args);
    case 'updateTransaction':
      return updateTransaction(args);
    case 'deleteTransaction':
      return deleteTransaction(args);
    case 'getSummary':
      return getSummary();
    default:
      throw new Error(`Unknown tool: ${toolName ?? 'missing'}`);
  }
}

async function listWallets(args: Record<string, unknown>) {
  const includeArchived = args.includeArchived === true;
  const query = readOptionalString(args.query)?.trim();
  const wallets = await prisma.wallet.findMany({
    where: {
      ...(includeArchived ? {} : { status: 'ACTIVE' }),
      ...(query ? { name: { contains: query } } : {})
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }]
  });

  return { wallets: wallets.map(serializeWallet) };
}

async function createWallet(args: Record<string, unknown>) {
  const name = readRequiredString(args.name, 'name');
  const wallet = await prisma.wallet.create({
    data: {
      name,
      color: readOptionalString(args.color)?.trim() || '#059669',
      comment: readOptionalString(args.comment)?.trim() || null,
      currency: readOptionalString(args.currency)?.trim() || 'USD',
      initialBalanceCents: centsFromAmount(readOptionalNumber(args.initialBalance) ?? 0)
    }
  });

  notify('wallet.created', { walletId: wallet.id });

  return { wallet: serializeWallet(wallet) };
}

async function updateWallet(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const data = {
    ...(args.name !== undefined ? { name: readRequiredString(args.name, 'name') } : {}),
    ...(args.comment !== undefined
      ? { comment: readOptionalString(args.comment)?.trim() || null }
      : {}),
    ...(args.currency !== undefined
      ? { currency: readRequiredString(args.currency, 'currency') }
      : {}),
    ...(args.color !== undefined ? { color: readRequiredString(args.color, 'color') } : {}),
    ...(args.initialBalance !== undefined
      ? { initialBalanceCents: centsFromAmount(readNumber(args.initialBalance)) }
      : {}),
    ...(args.status !== undefined ? { status: readRecordStatus(args.status) } : {})
  };

  if (Object.keys(data).length === 0) {
    throw new Error('at least one wallet field is required');
  }

  const wallet = await prisma.wallet
    .update({ where: { id }, data })
    .catch(mapNotFound('wallet not found'));

  notify('wallet.updated', { walletId: wallet.id });

  return { wallet: serializeWallet(wallet) };
}

async function deleteWallet(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const transactionCount = await prisma.transaction.count({ where: { walletId: id } });

  if (transactionCount > 0) {
    throw new Error(
      'Wallet has transactions. Change it with updateWallet status=ARCHIVED, or move/delete its transactions first.'
    );
  }

  const wallet = await prisma.wallet.delete({ where: { id } }).catch(mapNotFound('wallet not found'));

  notify('wallet.deleted', { walletId: wallet.id });

  return { wallet: serializeWallet(wallet) };
}

async function listCategories(args: Record<string, unknown>) {
  const includeArchived = args.includeArchived === true;
  const query = readOptionalString(args.query)?.trim();
  const parentId = readOptionalString(args.parentId)?.trim();
  const scope = args.scope === undefined ? null : readOptionalCategoryScope(args.scope);
  const categories = await prisma.category.findMany({
    include: { parent: true },
    where: {
      ...(includeArchived ? {} : { status: 'ACTIVE' }),
      ...(parentId ? { parentId } : {}),
      ...(scope ? { scope } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { parent: { name: { contains: query } } }
            ]
          }
        : {})
    },
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }]
  });

  return { categories: categories.map(serializeCategory) };
}

async function createCategory(args: Record<string, unknown>) {
  const name = readRequiredString(args.name, 'name');
  const categoryId = await upsertCategoryPath(name, {
    color: readOptionalString(args.color)?.trim() || undefined,
    parentId: readOptionalString(args.parentId)?.trim() || null,
    scope: readOptionalCategoryScope(args.scope)
  });
  const category = await prisma.category.findUniqueOrThrow({
    include: { parent: true },
    where: { id: categoryId }
  });

  notify('category.upserted', { categoryId: category.id });

  return { category: serializeCategory(category) };
}

async function updateCategory(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const data = {
    ...(args.name !== undefined ? { name: readRequiredString(args.name, 'name') } : {}),
    ...(args.parentId !== undefined
      ? { parentId: readOptionalString(args.parentId)?.trim() || null }
      : {}),
    ...(args.color !== undefined ? { color: readRequiredString(args.color, 'color') } : {}),
    ...(args.scope !== undefined ? { scope: readOptionalCategoryScope(args.scope) ?? undefined } : {}),
    ...(args.status !== undefined ? { status: readRecordStatus(args.status) } : {})
  };

  if (Object.keys(data).length === 0) {
    throw new Error('at least one category field is required');
  }
  if (data.parentId === id) {
    throw new Error('category cannot be its own parent');
  }

  const category = await prisma.category
    .update({
      include: { parent: true },
      where: { id },
      data
    })
    .catch(mapNotFound('category not found'));

  notify('category.updated', { categoryId: category.id });

  return { category: serializeCategory(category) };
}

async function deleteCategory(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const [transactionCount, childCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } })
  ]);

  if (transactionCount > 0 || childCount > 0) {
    throw new Error(
      'Category has transactions or subcategories. Change it with updateCategory status=ARCHIVED, or move/delete related records first.'
    );
  }

  const category = await prisma.category
    .delete({ include: { parent: true }, where: { id } })
    .catch(mapNotFound('category not found'));

  notify('category.deleted', { categoryId: category.id });

  return { category: serializeCategory(category) };
}

async function createTransaction(args: Record<string, unknown>) {
  const type = readTransactionType(args.type);
  const amount = readNumber(args.amount);
  const categoryId = await resolveCategoryId(args);
  const walletId = await resolveWalletId(args);
  const note = readOptionalString(args.note)?.trim() || null;
  const occurredAtValue = readOptionalString(args.occurredAt);
  const occurredAt = occurredAtValue ? new Date(occurredAtValue) : new Date();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number');
  }
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('occurredAt must be a valid date string');
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      amountCents: centsFromAmount(amount),
      categoryId,
      walletId,
      note,
      occurredAt
    },
    include: { category: { include: { parent: true } }, wallet: true }
  });

  notify('transaction.created', { transactionId: transaction.id });

  return { transaction: serializeTransaction(transaction) };
}

async function listTransactions(args: Record<string, unknown>) {
  const limit = Math.min(Math.max(Math.round(readOptionalNumber(args.limit) ?? 12), 1), 50);
  const where = await buildTransactionWhere(args);
  const transactions = await prisma.transaction.findMany({
    include: { category: { include: { parent: true } }, wallet: true },
    where,
    orderBy: { occurredAt: 'desc' },
    take: limit
  });

  return { transactions: transactions.map(serializeTransaction) };
}

async function getTransaction(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { category: { include: { parent: true } }, wallet: true }
  });

  if (!transaction) {
    throw new Error('transaction not found');
  }

  return { transaction: serializeTransaction(transaction) };
}

async function updateTransaction(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const data = {
    ...(args.type !== undefined ? { type: readTransactionType(args.type) } : {}),
    ...(args.amount !== undefined ? { amountCents: centsFromAmount(readNumber(args.amount)) } : {}),
    ...(args.walletId !== undefined || args.walletName !== undefined
      ? { walletId: await resolveWalletId(args) }
      : {}),
    ...(args.categoryId !== undefined || args.categoryName !== undefined
      ? { categoryId: await resolveCategoryId(args) }
      : {}),
    ...(args.note !== undefined ? { note: readOptionalString(args.note)?.trim() || null } : {}),
    ...(args.occurredAt !== undefined
      ? { occurredAt: readDate(readRequiredString(args.occurredAt, 'occurredAt')) }
      : {})
  };

  if (args.amount !== undefined && readNumber(args.amount) <= 0) {
    throw new Error('amount must be a positive number');
  }
  if (Object.keys(data).length === 0) {
    throw new Error('at least one transaction field is required');
  }

  const transaction = await prisma.transaction
    .update({
      where: { id },
      data,
      include: { category: { include: { parent: true } }, wallet: true }
    })
    .catch(mapNotFound('transaction not found'));

  notify('transaction.updated', { transactionId: transaction.id });

  return { transaction: serializeTransaction(transaction) };
}

async function deleteTransaction(args: Record<string, unknown>) {
  const id = readRequiredString(args.id, 'id');
  const transaction = await prisma.transaction
    .delete({
      where: { id },
      include: { category: { include: { parent: true } }, wallet: true }
    })
    .catch(mapNotFound('transaction not found'));

  notify('transaction.deleted', { transactionId: transaction.id });

  return { transaction: serializeTransaction(transaction) };
}

async function getSummary() {
  const snapshot = await getMoneySnapshot();

  return {
    categoryBreakdown: snapshot.categoryBreakdown,
    monthDynamics: snapshot.monthDynamics,
    summary: snapshot.summary,
    wallets: snapshot.wallets
  };
}

async function isAuthorized(request: NextRequest) {
  const token = readBearerToken(request);

  if (!token) {
    return false;
  }

  if (isLocalAuthMode()) {
    return moneyDevMcpToken() === token;
  }

  const response = await fetch(projectTokenIntrospectionUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...os7RequestHostHeader()
    }
  }).catch(() => null);

  if (!response?.ok) {
    return false;
  }

  const payload = (await response.json().catch(() => null)) as {
    active?: boolean;
    projectId?: string;
    role?: string;
  } | null;

  return (
    payload?.active === true &&
    payload.projectId === projectId() &&
    (payload.role === 'admin' || payload.role === 'editor')
  );
}

function notify(action: string, payload: Record<string, unknown>) {
  broadcastAppEvent({
    type: 'money.updated',
    payload: { action, ...payload }
  });
}

function readDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('occurredAt must be a valid date string');
  }

  return date;
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function jsonRpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result
  });
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    },
    { status: code === -32601 ? 404 : 400 }
  );
}

function mapNotFound(message: string) {
  return (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      throw new Error(message);
    }

    throw error;
  };
}
