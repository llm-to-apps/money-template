import { NextRequest } from 'next/server';

import { createMoneyWallet } from '@/features/wallets/service';
import { jsonMutationWithSnapshot } from '@/server/route-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  let walletId = '';

  return jsonMutationWithSnapshot({
    action: 'wallet.created',
    metadata: () => ({ walletId }),
    mutate: async () => {
      const { wallet } = await createMoneyWallet(body);
      walletId = wallet.id;
    },
    request,
    validationFallback: 'Invalid wallet'
  });
}
