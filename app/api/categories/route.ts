import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUser } from '../../lib/auth';
import { prisma } from '../../lib/db';
import { broadcastAppEvent } from '../../lib/events';
import {
  getMoneySnapshot,
  readOptionalCategoryScope,
  readOptionalString,
  readRequiredString,
  upsertCategoryPath
} from '../../lib/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const categoryId = await upsertCategoryPath(readRequiredString(body.name, 'name'), {
    color: readOptionalString(body.color)?.trim() || undefined,
    parentId: normalizeParentId(body.parentId),
    scope: readOptionalCategoryScope(body.scope)
  });
  const category = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'category.created', categoryId: category.id }
  });

  return NextResponse.json(await getMoneySnapshot());
}

function normalizeParentId(value: unknown) {
  const parentId = readOptionalString(value)?.trim();

  return parentId && parentId !== 'none' ? parentId : null;
}
