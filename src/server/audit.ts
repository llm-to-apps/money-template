import 'server-only';

import { logInfo, logWarn } from '@/server/logger';
import { prisma } from '@/server/db';

export type AuditAction =
  | 'category.created'
  | 'category.deleted'
  | 'category.updated'
  | 'transaction.created'
  | 'transaction.deleted'
  | 'transaction.updated'
  | 'wallet.created'
  | 'wallet.deleted'
  | 'wallet.updated';

export async function auditMoneyMutation({
  action,
  metadata = {},
  requestId,
  userId
}: {
  action: AuditAction;
  metadata?: Record<string, unknown>;
  requestId?: string;
  userId?: string;
}) {
  await prisma.auditEvent
    .create({
      data: {
        action,
        metadata: JSON.stringify(metadata),
        requestId,
        userId
      }
    })
    .catch((error: unknown) => {
      logWarn('audit.money_mutation.persist.failed', {
        action,
        error: error instanceof Error ? error.message : String(error),
        requestId,
        userId
      });
    });

  logInfo('audit.money_mutation.persist.finished', {
    action,
    audit: true,
    metadataKeys: Object.keys(metadata),
    requestId,
    userId
  });
}
