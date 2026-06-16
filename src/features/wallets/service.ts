import { broadcastAppEvent } from '@/server/events';
import { centsFromAmount, serializeWallet } from '@/server/money';
import { prisma } from '@/server/db';
import { throwAppError } from '@/shared/result';
import {
  type CreateWalletInput,
  type DeleteWalletInput,
  type ListWalletsInput,
  type UpdateWalletInput,
  parseCreateWalletInput,
  parseListWalletsInput,
  parseUpdateWalletInput,
  parseWalletId
} from './schemas';

export async function listMoneyWallets(input: ListWalletsInput) {
  const parsed = parseListWalletsInput(input);
  const wallets = await prisma.wallet.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    where: {
      ...(parsed.includeArchived ? {} : { status: 'ACTIVE' }),
      ...(parsed.query ? { name: { contains: parsed.query } } : {})
    }
  });

  return { wallets: wallets.map(serializeWallet) };
}

export async function createMoneyWallet(input: CreateWalletInput) {
  const parsed = parseCreateWalletInput(input);
  const wallet = await prisma.wallet.create({
    data: {
      color: parsed.color,
      comment: parsed.comment,
      currency: parsed.currency,
      initialBalanceCents: centsFromAmount(parsed.initialBalance),
      name: parsed.name
    }
  });

  notify('wallet.created', { walletId: wallet.id });

  return { wallet: serializeWallet(wallet) };
}

export async function getMoneyWallet(input: DeleteWalletInput) {
  const id = parseWalletId(input);
  const wallet = await prisma.wallet.findUnique({ where: { id } });

  if (!wallet) {
    throwAppError('NOT_FOUND', 'wallet not found');
  }

  return { wallet: serializeWallet(wallet) };
}

export async function updateMoneyWallet(input: UpdateWalletInput) {
  const parsed = parseUpdateWalletInput(input);
  const { initialBalance, ...data } = parsed.data;
  const wallet = await prisma.wallet
    .update({
      data: {
        ...data,
        ...(initialBalance !== undefined
          ? { initialBalanceCents: centsFromAmount(initialBalance) }
          : {})
      },
      where: { id: parsed.id }
    })
    .catch(mapNotFound('wallet not found'));

  notify('wallet.updated', { walletId: wallet.id });

  return { wallet: serializeWallet(wallet) };
}

export async function deleteMoneyWallet(input: DeleteWalletInput) {
  const id = parseWalletId(input);
  const transactionCount = await prisma.transaction.count({
    where: { walletId: id }
  });

  if (transactionCount > 0) {
    throwAppError(
      'CONFLICT',
      'Wallet has transactions. Change it with updateWallet status=ARCHIVED, or move/delete its transactions first.'
    );
  }

  const wallet = await prisma.wallet
    .delete({ where: { id } })
    .catch(mapNotFound('wallet not found'));

  notify('wallet.deleted', { walletId: wallet.id });

  return { wallet: serializeWallet(wallet) };
}

function notify(action: string, payload: Record<string, unknown>) {
  broadcastAppEvent({
    type: 'money.updated',
    payload: { action, ...payload }
  });
}

function mapNotFound(message: string) {
  return (error: unknown) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2025'
    ) {
      throwAppError('NOT_FOUND', message);
    }

    throw error;
  };
}
