import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '../../../lib/auth';
import { prisma } from '../../../lib/db';
import { broadcastAppEvent } from '../../../lib/events';
import {
  getMoneySnapshot,
  readOptionalCategoryScope,
  readOptionalString,
  readRecordStatus,
  readRequiredString
} from '../../../lib/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const id = await readRouteId(params);
  const body = (await request.json()) as Record<string, unknown>;
  const parentId =
    body.parentId !== undefined ? normalizeParentId(body.parentId) : undefined;

  if (parentId === id) {
    return NextResponse.json(
      { ok: false, message: 'Category cannot be its own parent' },
      { status: 400 }
    );
  }

  await prisma.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: readRequiredString(body.name, 'name') } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(body.color !== undefined ? { color: readRequiredString(body.color, 'color') } : {}),
      ...(body.scope !== undefined
        ? { scope: readOptionalCategoryScope(body.scope) ?? undefined }
        : {}),
      ...(body.status !== undefined ? { status: readRecordStatus(body.status) } : {})
    }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'category.updated', categoryId: id }
  });

  return NextResponse.json(await getMoneySnapshot());
}

function normalizeParentId(value: unknown) {
  const parentId = readOptionalString(value)?.trim();

  return parentId && parentId !== 'none' ? parentId : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const id = await readRouteId(params);
  const [transactionCount, childCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } })
  ]);

  if (transactionCount > 0 || childCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Category has transactions or subcategories. Change status to ARCHIVED instead, or move/delete related records first.'
      },
      { status: 409 }
    );
  }

  await prisma.category.delete({ where: { id } });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'category.deleted', categoryId: id }
  });

  return NextResponse.json(await getMoneySnapshot());
}

async function readRouteId(params: Promise<unknown>) {
  const resolved = await params;

  if (
    !resolved ||
    typeof resolved !== 'object' ||
    !('id' in resolved) ||
    typeof resolved.id !== 'string'
  ) {
    throw new Error('id is required');
  }

  return resolved.id;
}
