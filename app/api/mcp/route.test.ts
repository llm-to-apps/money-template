import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  callMcpTool: vi.fn(),
  checkRateLimit: vi.fn(),
  isLocalAuthMode: vi.fn(),
  mcpTools: [
    {
      name: 'listWallets',
      description: 'List wallets',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  ],
  moneyDevMcpToken: vi.fn()
}));

vi.mock('@/mcp/tools', () => ({
  callMcpTool: mocks.callMcpTool,
  mcpTools: mocks.mcpTools
}));

vi.mock('@/server/env', () => ({
  isLocalAuthMode: mocks.isLocalAuthMode,
  moneyDevMcpToken: mocks.moneyDevMcpToken,
  os7RequestHostHeader: vi.fn(),
  projectId: vi.fn(),
  projectTokenIntrospectionUrl: vi.fn()
}));

vi.mock('@/server/rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit
}));

describe('MCP API route', () => {
  it('rejects requests without a bearer token', async () => {
    const { GET } = await import('./route');

    const response = await GET(
      new Request('http://localhost/api/mcp') as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('lists tools over JSON-RPC when authorized', async () => {
    mocks.isLocalAuthMode.mockReturnValue(true);
    mocks.moneyDevMcpToken.mockReturnValue('dev-token');
    mocks.checkRateLimit.mockReturnValue({ ok: true });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/mcp', {
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        }),
        headers: {
          authorization: 'Bearer dev-token',
          'content-type': 'application/json'
        },
        method: 'POST'
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 1,
      jsonrpc: '2.0',
      result: { tools: mocks.mcpTools }
    });
  });

  it('calls tools and returns structured content', async () => {
    mocks.isLocalAuthMode.mockReturnValue(true);
    mocks.moneyDevMcpToken.mockReturnValue('dev-token');
    mocks.checkRateLimit.mockReturnValue({ ok: true });
    mocks.callMcpTool.mockResolvedValue({
      wallet: { id: 'wallet_1', name: 'Main' }
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/mcp', {
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'call_1',
          method: 'tools/call',
          params: {
            name: 'createWallet',
            arguments: { name: 'Main' }
          }
        }),
        headers: {
          authorization: 'Bearer dev-token',
          'content-type': 'application/json'
        },
        method: 'POST'
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'call_1',
      result: {
        structuredContent: {
          wallet: { id: 'wallet_1', name: 'Main' }
        }
      }
    });
    expect(mocks.callMcpTool).toHaveBeenCalledWith('createWallet', {
      name: 'Main'
    });
  });

  it('maps tool failures to JSON-RPC errors', async () => {
    mocks.isLocalAuthMode.mockReturnValue(true);
    mocks.moneyDevMcpToken.mockReturnValue('dev-token');
    mocks.checkRateLimit.mockReturnValue({ ok: true });
    mocks.callMcpTool.mockRejectedValue(new Error('Unknown tool: nope'));

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/mcp', {
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'nope',
            arguments: {}
          }
        }),
        headers: {
          authorization: 'Bearer dev-token',
          'content-type': 'application/json'
        },
        method: 'POST'
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: -32000,
        message: 'Unknown tool: nope'
      },
      id: 2,
      jsonrpc: '2.0'
    });
  });
});
