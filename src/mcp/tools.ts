import 'server-only';

import { getMoneySnapshot } from '@/server/money';
import {
  createCategoryInputSchema,
  deleteCategoryInputSchema,
  listCategoriesInputSchema,
  updateCategoryInputSchema
} from '@/features/categories/schemas';
import {
  createMoneyCategory,
  deleteMoneyCategory,
  listMoneyCategories,
  updateMoneyCategory
} from '@/features/categories/service';
import {
  createTransactionInputSchema,
  deleteTransactionInputSchema,
  getTransactionInputSchema,
  listTransactionsInputSchema,
  updateTransactionInputSchema
} from '@/features/transactions/schemas';
import {
  createMoneyTransaction,
  deleteMoneyTransaction,
  getMoneyTransaction,
  listMoneyTransactions,
  updateMoneyTransaction
} from '@/features/transactions/service';
import {
  createWalletInputSchema,
  deleteWalletInputSchema,
  listWalletsInputSchema,
  updateWalletInputSchema
} from '@/features/wallets/schemas';
import {
  createMoneyWallet,
  deleteMoneyWallet,
  listMoneyWallets,
  updateMoneyWallet
} from '@/features/wallets/service';
import type { McpToolDefinition, McpToolRegistration } from '@/mcp/types';

const mcpToolRegistry = [
  {
    name: 'listWallets',
    description:
      'List Money wallets with compact balances and archive status. Use walletId or walletName from this tool when creating or filtering transactions. Default includes active wallets; pass includeArchived=true only when historical or cleanup work needs it.',
    inputSchema: listWalletsInputSchema,
    handler: listMoneyWallets
  },
  {
    name: 'createWallet',
    description:
      'Create a Money wallet. name is required. comment is optional free-form text for details such as card, cash, bank account, or usage notes. initialBalance is a decimal major-unit amount. This mutation refreshes the Money UI.',
    inputSchema: createWalletInputSchema,
    handler: createMoneyWallet
  },
  {
    name: 'updateWallet',
    description:
      'Update one Money wallet by id. Only pass fields to change. Use this for renaming, changing comment/color/currency, adjusting initial balance, or setting status to ACTIVE or ARCHIVED when an account/card is closed but history must stay visible.',
    inputSchema: updateWalletInputSchema,
    handler: updateMoneyWallet
  },
  {
    name: 'deleteWallet',
    description:
      'Delete a wallet by id only when it has no transactions. If it has transactions, this returns an error; use updateWallet with status=ARCHIVED to hide a closed account while keeping historical reports valid. This mutation refreshes the Money UI.',
    inputSchema: deleteWalletInputSchema,
    handler: deleteMoneyWallet
  },
  {
    name: 'listCategories',
    description:
      'List Money categories and subcategories with labels like "Car / Fuel". Use categoryId or categoryName from this tool when creating or filtering transactions. Pass includeArchived=true only when cleanup work needs archived categories.',
    inputSchema: listCategoriesInputSchema,
    handler: listMoneyCategories
  },
  {
    name: 'createCategory',
    description:
      'Create a category or subcategory. name can be a path such as "Car / Fuel"; Money will create missing parents. scope can be INCOME, EXPENSE, or BOTH. This mutation refreshes the Money UI.',
    inputSchema: createCategoryInputSchema,
    handler: createMoneyCategory
  },
  {
    name: 'updateCategory',
    description:
      'Update one category by id. Only pass fields to change. parentId can move a category under a parent. Set status to ACTIVE or ARCHIVED without deleting historical transactions. This mutation refreshes the Money UI.',
    inputSchema: updateCategoryInputSchema,
    handler: updateMoneyCategory
  },
  {
    name: 'deleteCategory',
    description:
      'Delete a category by id only when it has no transactions and no children. If it is used, this returns an error; use updateCategory with status=ARCHIVED to hide it while keeping historical reports valid. This mutation refreshes the Money UI.',
    inputSchema: deleteCategoryInputSchema,
    handler: deleteMoneyCategory
  },
  {
    name: 'createTransaction',
    description:
      'Create one Money transaction. type must be INCOME or EXPENSE. amount is a decimal major-unit value. Provide walletId or walletName; provide categoryId or categoryName. categoryName may be a path like "Car / Fuel" and will create missing categories. occurredAt is optional ISO/date string and defaults to now. This mutation refreshes the Money UI.',
    inputSchema: createTransactionInputSchema,
    handler: createMoneyTransaction
  },
  {
    name: 'listTransactions',
    description:
      'List or search Money transactions with cursor pagination and bounded results. Supports cursor, limit, filters by type, walletId/walletName, categoryId/categoryName, parentCategoryId/parentCategoryName, from/to date range, minAmount/maxAmount, and text query over note/category/wallet. Default limit is 12, max limit is 50. Use pageInfo.nextCursor for the next page instead of broad datasets.',
    inputSchema: listTransactionsInputSchema,
    handler: listMoneyTransactions
  },
  {
    name: 'getTransaction',
    description:
      'Get one Money transaction by id. Use this after listTransactions when you need a complete business object.',
    inputSchema: getTransactionInputSchema,
    handler: getMoneyTransaction
  },
  {
    name: 'updateTransaction',
    description:
      'Update one Money transaction by id. Only pass fields that should change. Supports walletId/walletName and categoryId/categoryName. categoryName may be a path like "Car / Repair". This mutation refreshes the Money UI.',
    inputSchema: updateTransactionInputSchema,
    handler: updateMoneyTransaction
  },
  {
    name: 'deleteTransaction',
    description:
      'Delete one Money transaction by id. Use listTransactions first if the user identified the transaction by description rather than id. This mutation refreshes the Money UI.',
    inputSchema: deleteTransactionInputSchema,
    handler: deleteMoneyTransaction
  },
  {
    name: 'getSummary',
    description:
      'Return compact Money dashboard data: totals, current and previous month summary, wallet balances, category breakdown, and month dynamics. Use this instead of listing many transactions.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    handler: getSummary
  }
] satisfies McpToolRegistration[];

export const mcpTools: McpToolDefinition[] = mcpToolRegistry.map(
  (registration) => ({
    description: registration.description,
    inputSchema: registration.inputSchema,
    name: registration.name
  })
);

const mcpHandlers = new Map<string, McpToolRegistration>();

for (const registration of mcpToolRegistry) {
  mcpHandlers.set(registration.name, registration);
}

export async function callMcpTool(
  toolName: string | undefined,
  args: Record<string, unknown>
) {
  const registration = toolName ? mcpHandlers.get(toolName) : undefined;

  if (!registration) {
    throw new Error(`Unknown tool: ${toolName ?? 'missing'}`);
  }

  return registration.handler(args);
}

async function getSummary() {
  const snapshot = await getMoneySnapshot();

  return {
    categoryBreakdown: snapshot.categoryBreakdown,
    monthDynamics: snapshot.monthDynamics,
    summary: snapshot.summary,
    wallets: snapshot.wallets
  };
}
