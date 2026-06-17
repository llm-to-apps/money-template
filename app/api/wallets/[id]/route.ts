import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/server/auth';
import {
  deleteMoneyWallet,
  getMoneyWallet,
  updateMoneyWallet
} from '@/features/wallets/service';
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
    return jsonOk(await getMoneyWallet({ id }));
  } catch (error) {
    return jsonErrorFromUnknown(error, 'Invalid wallet');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const id = await readRouteId(params);
  const body = (await request.json()) as Record<string, unknown>;

  return jsonMutationWithSnapshot({
    action: 'wallet.updated',
    metadata: () => ({ walletId: id }),
    mutate: async () => {
      await updateMoneyWallet({ ...body, id });
    },
    request,
    validationFallback: 'Invalid wallet'
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const id = await readRouteId(params);

  return jsonMutationWithSnapshot({
    action: 'wallet.deleted',
    metadata: () => ({ walletId: id }),
    mutate: async () => {
      await deleteMoneyWallet({ id });
    },
    request,
    validationFallback: 'Invalid wallet'
  });
}
