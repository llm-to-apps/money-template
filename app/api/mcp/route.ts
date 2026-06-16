import { NextRequest, NextResponse } from 'next/server';

import {
  isLocalAuthMode,
  moneyDevMcpToken,
  os7RequestHostHeader,
  projectId,
  projectTokenIntrospectionUrl
} from '@/server/env';
import { callMcpTool, mcpTools } from '@/mcp/tools';
import { clientRateLimitKey } from '@/server/request-context';
import { checkRateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
  tool?: string;
  arguments?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitResponse = enforceMcpRateLimit(request);
  if (limitResponse) {
    return limitResponse;
  }

  return NextResponse.json({ tools: mcpTools });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitResponse = enforceMcpRateLimit(request);
  if (limitResponse) {
    return limitResponse;
  }

  const body = (await request.json()) as JsonRpcRequest;
  const id = body.id ?? null;

  if (body.method === 'tools/list') {
    return jsonRpcResult(id, { tools: mcpTools });
  }

  const toolName = body.params?.name ?? body.tool;
  const args = body.params?.arguments ?? body.arguments ?? {};

  if (body.method === 'tools/call' || body.tool) {
    try {
      const result = await callMcpTool(toolName, args);

      return jsonRpcResult(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ],
        structuredContent: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool failed';

      return jsonRpcError(id, -32000, message);
    }
  }

  return jsonRpcError(id, -32601, 'Method not found');
}

function enforceMcpRateLimit(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: `mcp:${clientRateLimitKey(request, 'anonymous')}`,
    limit: 240,
    windowMs: 60_000
  });

  if (rateLimit.ok) {
    return null;
  }

  return NextResponse.json(
    {
      error: 'Too many requests'
    },
    { status: 429 }
  );
}

async function isAuthorized(request: NextRequest) {
  const token = readBearerToken(request);

  if (!token) {
    return false;
  }

  if (isLocalAuthMode()) {
    return moneyDevMcpToken() === token;
  }

  const response = await fetch(projectTokenIntrospectionUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...os7RequestHostHeader()
    }
  }).catch(() => null);

  if (!response?.ok) {
    return false;
  }

  const payload = (await response.json().catch(() => null)) as {
    active?: boolean;
    projectId?: string;
    role?: string;
  } | null;

  return (
    payload?.active === true &&
    payload.projectId === projectId() &&
    (payload.role === 'admin' || payload.role === 'editor')
  );
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function jsonRpcResult(id: string | number | null, result: unknown) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    result
  });
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string
) {
  return NextResponse.json(
    {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    },
    { status: code === -32601 ? 404 : 400 }
  );
}
