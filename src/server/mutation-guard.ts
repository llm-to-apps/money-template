import 'server-only';

import { NextRequest } from 'next/server';

import { getCurrentUser } from '@/server/auth';
import { clientRateLimitKey, requestId } from '@/server/request-context';
import { checkRateLimit } from '@/server/rate-limit';
import { jsonError } from '@/server/http';

const mutationLimit = {
  limit: 120,
  windowMs: 60_000
};

export async function authorizeMoneyMutation(request: NextRequest) {
  const currentRequestId = requestId(request);
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false as const,
      response: jsonError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })
    };
  }

  const rateLimit = checkRateLimit({
    key: `mutation:${clientRateLimitKey(request, user.id)}`,
    ...mutationLimit
  });

  if (!rateLimit.ok) {
    return {
      ok: false as const,
      response: jsonError({
        code: 'RATE_LIMITED',
        message: 'Too many requests'
      })
    };
  }

  return {
    ok: true as const,
    requestId: currentRequestId,
    user
  };
}
