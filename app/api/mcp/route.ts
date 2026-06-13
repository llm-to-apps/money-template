import { NextRequest, NextResponse } from 'next/server';
import { TransactionType } from '@prisma/client';

import { broadcastAppEvent } from '../../lib/events';
import { prisma } from '../../lib/db';
import {
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
    name: 'listExpenseCategories',
    description: 'List all Money categories.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'addExpenseCategory',
    description: 'Create or update an expense category by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' }
      },
      required: ['name'],
      additionalProperties: false
    }
  },
  {
    name: 'createTransaction',
    description: 'Create an income or expense transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
        amount: { type: 'number' },
        categoryId: { type: 'string' },
        categoryName: { type: 'string' },
        note: { type: 'string' },
        occurredAt: { type: 'string' }
      },
      required: ['type', 'amount'],
      additionalProperties: false
    }
  },
  {
    name: 'listTransactions',
    description: 'List recent Money transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'getSummary',
    description: 'Return current balance, income, and expense totals.',
    inputSchema: {
      type: 'object',
      properties: {},
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
    case 'listExpenseCategories':
      return listExpenseCategories();
    case 'addExpenseCategory':
      return addExpenseCategory(args);
    case 'createTransaction':
      return createTransaction(args);
    case 'listTransactions':
      return listTransactions(args);
    case 'getSummary':
      return getSummary();
    default:
      throw new Error(`Unknown tool: ${toolName ?? 'missing'}`);
  }
}

async function listExpenseCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });

  return { categories };
}

async function addExpenseCategory(args: Record<string, unknown>) {
  const name = readString(args.name).trim();
  const color = readOptionalString(args.color)?.trim() || '#0f8b6f';

  if (!name) {
    throw new Error('name is required');
  }

  const category = await prisma.category.upsert({
    where: { name },
    update: { color },
    create: { name, color }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'category.upserted', categoryId: category.id }
  });

  return { category };
}

async function createTransaction(args: Record<string, unknown>) {
  const type = readTransactionType(args.type);
  const amount = readNumber(args.amount);
  const categoryId = await resolveCategoryId(args);
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
      amountCents: Math.round(amount * 100),
      categoryId,
      note,
      occurredAt
    },
    include: { category: true }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'transaction.created', transactionId: transaction.id }
  });

  return { transaction };
}

async function listTransactions(args: Record<string, unknown>) {
  const limit = Math.min(Math.max(Math.round(readOptionalNumber(args.limit) ?? 12), 1), 50);
  const transactions = await prisma.transaction.findMany({
    include: { category: true },
    orderBy: { occurredAt: 'desc' },
    take: limit
  });

  return { transactions };
}

async function getSummary() {
  const totals = await prisma.transaction.groupBy({
    by: ['type'],
    _sum: { amountCents: true }
  });
  const income =
    totals.find((item) => item.type === TransactionType.INCOME)?._sum.amountCents ?? 0;
  const expenses =
    totals.find((item) => item.type === TransactionType.EXPENSE)?._sum.amountCents ?? 0;

  return {
    balanceCents: income - expenses,
    incomeCents: income,
    expensesCents: expenses
  };
}

async function resolveCategoryId(args: Record<string, unknown>) {
  const categoryId = readOptionalString(args.categoryId);

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });

    if (!category) {
      throw new Error('categoryId does not exist');
    }

    return category.id;
  }

  const categoryName = readOptionalString(args.categoryName)?.trim();

  if (!categoryName) {
    throw new Error('categoryId or categoryName is required');
  }

  const category = await prisma.category.upsert({
    where: { name: categoryName },
    update: {},
    create: { name: categoryName }
  });

  return category.id;
}

async function isAuthorized(request: NextRequest) {
  const token = readBearerToken(request);

  if (!token) {
    return false;
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

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value);
}

function readOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return readNumber(value);
}

function readTransactionType(value: unknown) {
  if (value === TransactionType.INCOME || value === TransactionType.EXPENSE) {
    return value;
  }

  throw new Error('type must be INCOME or EXPENSE');
}
