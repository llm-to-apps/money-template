import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createMoneyCategory: vi.fn(),
  createMoneyTransaction: vi.fn(),
  createMoneyWallet: vi.fn(),
  deleteMoneyCategory: vi.fn(),
  deleteMoneyTransaction: vi.fn(),
  deleteMoneyWallet: vi.fn(),
  getMoneySnapshot: vi.fn(),
  getMoneyTransaction: vi.fn(),
  listMoneyCategories: vi.fn(),
  listMoneyTransactions: vi.fn(),
  listMoneyWallets: vi.fn(),
  updateMoneyCategory: vi.fn(),
  updateMoneyTransaction: vi.fn(),
  updateMoneyWallet: vi.fn()
}));

vi.mock('@/server/money', () => ({
  getMoneySnapshot: mocks.getMoneySnapshot
}));

vi.mock('@/features/categories/service', () => ({
  createMoneyCategory: mocks.createMoneyCategory,
  deleteMoneyCategory: mocks.deleteMoneyCategory,
  listMoneyCategories: mocks.listMoneyCategories,
  updateMoneyCategory: mocks.updateMoneyCategory
}));

vi.mock('@/features/transactions/service', () => ({
  createMoneyTransaction: mocks.createMoneyTransaction,
  deleteMoneyTransaction: mocks.deleteMoneyTransaction,
  getMoneyTransaction: mocks.getMoneyTransaction,
  listMoneyTransactions: mocks.listMoneyTransactions,
  updateMoneyTransaction: mocks.updateMoneyTransaction
}));

vi.mock('@/features/wallets/service', () => ({
  createMoneyWallet: mocks.createMoneyWallet,
  deleteMoneyWallet: mocks.deleteMoneyWallet,
  listMoneyWallets: mocks.listMoneyWallets,
  updateMoneyWallet: mocks.updateMoneyWallet
}));

describe('MCP tool registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes bounded Money tools with input schemas', async () => {
    const { mcpTools } = await import('./tools');

    expect(mcpTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'createTransaction',
          inputSchema: expect.objectContaining({
            additionalProperties: false,
            type: 'object'
          })
        }),
        expect.objectContaining({
          name: 'listTransactions',
          description: expect.stringContaining('cursor pagination'),
          inputSchema: expect.objectContaining({
            additionalProperties: false,
            type: 'object'
          })
        }),
        expect.objectContaining({ name: 'getSummary' })
      ])
    );
  });

  it('dispatches category tools to their registered service handler', async () => {
    const { callMcpTool } = await import('./tools');
    mocks.listMoneyCategories.mockResolvedValue({
      categories: [{ id: 'category_1', name: 'Food' }]
    });

    await expect(callMcpTool('listCategories', {})).resolves.toMatchObject({
      categories: [{ id: 'category_1', name: 'Food' }]
    });
    expect(mocks.listMoneyCategories).toHaveBeenCalledWith({});
  });

  it('returns compact summary data without dumping transactions', async () => {
    const { callMcpTool } = await import('./tools');
    mocks.getMoneySnapshot.mockResolvedValue({
      categories: [],
      categoryBreakdown: [],
      initialTransactionsPage: {
        pageInfo: { hasNextPage: false, nextCursor: null },
        transactions: [{ id: 'transaction_1' }]
      },
      monthDynamics: [],
      summary: { balanceCents: 0 },
      wallets: []
    });

    await expect(callMcpTool('getSummary', {})).resolves.toEqual({
      categoryBreakdown: [],
      monthDynamics: [],
      summary: { balanceCents: 0 },
      wallets: []
    });
  });

  it('rejects unknown tools', async () => {
    const { callMcpTool } = await import('./tools');

    await expect(callMcpTool('missingTool', {})).rejects.toThrow(
      'Unknown tool: missingTool'
    );
  });
});
