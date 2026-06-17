import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/server/auth';
import {
  deleteMoneyCategory,
  getMoneyCategory,
  updateMoneyCategory
} from '@/features/categories/service';
import { jsonMutationWithSnapshot, readRouteId } from '@/server/route-helpers';
import { jsonError, jsonErrorFromUnknown, jsonOk } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  if (!(await getCurrentUser())) {
    return jsonError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  const id = await readRouteId(params);

  try {
    return jsonOk(await getMoneyCategory({ id }));
  } catch (error) {
    return jsonErrorFromUnknown(error, 'Invalid category');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const id = await readRouteId(params);
  const body = (await request.json()) as Record<string, unknown>;

  return jsonMutationWithSnapshot({
    action: 'category.updated',
    metadata: () => ({ categoryId: id }),
    mutate: async () => {
      await updateMoneyCategory({ ...body, id });
    },
    request,
    validationFallback: 'Invalid category'
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const id = await readRouteId(params);

  return jsonMutationWithSnapshot({
    action: 'category.deleted',
    metadata: () => ({ categoryId: id }),
    mutate: async () => {
      await deleteMoneyCategory({ id });
    },
    request,
    validationFallback: 'Invalid category'
  });
}
