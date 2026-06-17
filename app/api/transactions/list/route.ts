import { NextRequest } from 'next/server';

import { listMoneyTransactions } from '@/features/transactions/service';
import { getCurrentUser } from '@/server/auth';
import { jsonError, jsonErrorFromUnknown, jsonOk } from '@/shared/result';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return jsonError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  try {
    return jsonOk(
      await listMoneyTransactions(
        Object.fromEntries(request.nextUrl.searchParams.entries())
      )
    );
  } catch (error) {
    return jsonErrorFromUnknown(error, 'Invalid transaction filters');
  }
}
