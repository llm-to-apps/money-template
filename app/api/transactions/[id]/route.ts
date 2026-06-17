import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/server/auth';
import {
  deleteMoneyTransaction,
  getMoneyTransaction,
  updateMoneyTransaction
} from '@/features/transactions/service';
import { jsonMutationWithSnapshot, readRouteId } from '@/server/route-helpers';
import { jsonError, jsonErrorFromUnknown, jsonOk } from '@/shared/result';

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
    return jsonOk(await getMoneyTransaction({ id }));
  } catch (error) {
    return jsonErrorFromUnknown(error, 'Invalid transaction');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const id = await readRouteId(params);
  const body = (await request.json()) as Record<string, unknown>;

  return jsonMutationWithSnapshot({
    action: 'transaction.updated',
    metadata: () => ({ transactionId: id }),
    mutate: async () => {
      await updateMoneyTransaction({ ...body, id });
    },
    request,
    validationFallback: 'Invalid transaction'
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const id = await readRouteId(params);
  return jsonMutationWithSnapshot({
    action: 'transaction.deleted',
    metadata: () => ({ transactionId: id }),
    mutate: async () => {
      await deleteMoneyTransaction({ id });
    },
    request,
    validationFallback: 'Invalid transaction'
  });
}
