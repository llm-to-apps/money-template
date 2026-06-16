import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const authorization = {
  authorization: `Bearer ${process.env.MONEY_DEV_MCP_TOKEN ?? 'dev-money-token'}`
};

test.describe('database-backed MCP flows', () => {
  test.skip(
    process.env.RUN_DB_E2E !== '1',
    'Set RUN_DB_E2E=1 with a migrated local DATABASE_URL to run MCP CRUD flows.'
  );

  test('creates Money records through MCP tools', async ({ request }) => {
    const suffix = Date.now().toString(36);
    const walletName = `MCP Wallet ${suffix}`;
    const categoryName = `MCP Category ${suffix}`;

    const toolsResponse = await request.post('/api/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 'tools',
        method: 'tools/list'
      },
      headers: authorization
    });
    expect(toolsResponse.ok()).toBe(true);
    await expect(toolsResponse.json()).resolves.toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: 'createWallet' }),
          expect.objectContaining({ name: 'createTransaction' })
        ])
      }
    });

    const walletResult = await callMcpTool(request, 'createWallet', {
      name: walletName,
      currency: 'USD',
      initialBalance: 250
    });
    const walletId = walletResult.wallet.id;

    const categoryResult = await callMcpTool(request, 'createCategory', {
      name: categoryName,
      scope: 'EXPENSE'
    });
    const categoryId = categoryResult.category.id;

    const transactionResult = await callMcpTool(request, 'createTransaction', {
      amount: 19.99,
      categoryId,
      note: `MCP transaction ${suffix}`,
      occurredAt: '2026-06-16',
      type: 'EXPENSE',
      walletId
    });
    expect(transactionResult.transaction).toMatchObject({
      amountCents: 1999,
      categoryId,
      note: `MCP transaction ${suffix}`,
      walletId
    });

    const listResult = await callMcpTool(request, 'listTransactions', {
      query: `MCP transaction ${suffix}`
    });
    expect(listResult.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: transactionResult.transaction.id,
          note: `MCP transaction ${suffix}`
        })
      ])
    );
  });
});

async function callMcpTool(
  request: APIRequestContext,
  name: string,
  args: Record<string, unknown>
) {
  const response = await request.post('/api/mcp', {
    data: {
      jsonrpc: '2.0',
      id: name,
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    },
    headers: authorization
  });

  expect(response.ok()).toBe(true);
  const payload = await response.json();
  return payload.result.structuredContent;
}
