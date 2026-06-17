import { NextRequest } from 'next/server';

import { getCurrentUser, isManuallyLoggedOut } from '@/server/auth';
import { getMoneySnapshot } from '@/server/money';
import { type AuditAction, auditMoneyMutation } from '@/server/audit';
import { authorizeMoneyMutation } from '@/server/mutation-guard';
import { jsonError, jsonErrorFromUnknown, jsonOk } from '@/shared/result';

export async function readRouteId(params: Promise<unknown>) {
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

export async function dashboardPayload() {
  const [user, manuallyLoggedOut] = await Promise.all([
    getCurrentUser(),
    isManuallyLoggedOut()
  ]);

  if (!user) {
    return {
      ok: false as const,
      response: jsonError({
        code: 'UNAUTHORIZED',
        details: {
          redirectTo: manuallyLoggedOut ? '/auth/signed-out' : '/auth/login'
        },
        message: 'Unauthorized'
      })
    };
  }

  const snapshot = await getMoneySnapshot();

  return {
    ok: true as const,
    payload: {
      ...snapshot,
      user: {
        displayName: user.name
      }
    }
  };
}

export async function jsonMutationWithSnapshot({
  action,
  metadata,
  mutate,
  request,
  validationFallback
}: {
  action: AuditAction;
  metadata: () => Record<string, string>;
  mutate: () => Promise<void>;
  request: NextRequest;
  validationFallback: string;
}) {
  const authorization = await authorizeMoneyMutation(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    await mutate();
    await auditMoneyMutation({
      action,
      metadata: metadata(),
      requestId: authorization.requestId,
      userId: authorization.user.id
    });
  } catch (error) {
    return jsonErrorFromUnknown(error, validationFallback);
  }

  return jsonOk(await getMoneySnapshot());
}
