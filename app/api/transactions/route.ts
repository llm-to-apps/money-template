import { NextRequest, NextResponse } from 'next/server';

import { getMoneySnapshot } from '@/server/money';
import { createMoneyTransaction } from '@/features/transactions/service';
import type { CreateTransactionInput } from '@/features/transactions/schemas';
import { auditMoneyMutation } from '@/server/audit';
import { authorizeMoneyMutation } from '@/server/mutation-guard';
import { jsonErrorFromUnknown, jsonOk } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authorization = await authorizeMoneyMutation(request);

  if (!authorization.ok) {
    return wantsJson(request)
      ? authorization.response
      : redirectTo('/auth/login');
  }

  const isJson = wantsJson(request);
  const body = isJson
    ? ((await request.json()) as CreateTransactionInput)
    : await readFormTransaction(request);

  try {
    const { transaction } = await createMoneyTransaction(body);
    await auditMoneyMutation({
      action: 'transaction.created',
      metadata: { transactionId: transaction.id },
      requestId: authorization.requestId,
      userId: authorization.user.id
    });
  } catch (error) {
    return isJson
      ? jsonErrorFromUnknown(error, 'Enter a valid transaction')
      : redirectTo('/');
  }

  return isJson ? jsonOk(await getMoneySnapshot()) : redirectTo('/');
}

async function readFormTransaction(
  request: NextRequest
): Promise<CreateTransactionInput> {
  const formData = await request.formData();

  return {
    amount: Number(formData.get('amount')),
    categoryId: String(formData.get('categoryId') ?? ''),
    note: String(formData.get('note') || ''),
    occurredAt: String(formData.get('occurredAt') || ''),
    type: String(formData.get('type')),
    walletId: String(formData.get('walletId') ?? '')
  };
}

function wantsJson(request: NextRequest) {
  return (
    request.headers.get('content-type')?.includes('application/json') === true
  );
}

function redirectTo(location: string) {
  return new NextResponse(null, {
    headers: {
      Location: location
    },
    status: 303
  });
}
