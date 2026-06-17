import 'server-only';

import { randomBytes } from 'node:crypto';

import { sentryDsn, sentryEnvironment, sentryRelease } from '@/server/env';

type ErrorReportContext = Record<string, unknown>;

export async function reportErrorToSentry({
  context = {},
  error,
  event
}: {
  context?: ErrorReportContext;
  error?: unknown;
  event: string;
}) {
  const dsn = sentryDsn();

  if (!dsn) {
    return false;
  }

  const endpoint = sentryEnvelopeEndpoint(dsn);

  if (!endpoint) {
    return false;
  }

  const sentryEvent = {
    event_id: randomBytes(16).toString('hex'),
    exception: {
      values: [sentryException(error ?? context.error ?? event)]
    },
    extra: redactContext(context),
    level: 'error',
    logger: 'money',
    platform: 'javascript',
    release: sentryRelease() ?? undefined,
    environment: sentryEnvironment() ?? undefined,
    tags: {
      app: 'money',
      event
    },
    timestamp: Date.now() / 1000,
    transaction: event
  };

  const envelope = [
    JSON.stringify({ dsn, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(sentryEvent)
  ].join('\n');

  const response = await fetch(endpoint, {
    body: envelope,
    headers: {
      'content-type': 'application/x-sentry-envelope'
    },
    method: 'POST'
  }).catch(() => null);

  return response?.ok === true;
}

function sentryEnvelopeEndpoint(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.split('/').filter(Boolean).at(-1);

    if (!projectId) {
      return null;
    }

    const basePath = url.pathname
      .replace(new RegExp(`/${escapeRegExp(projectId)}/?$`), '')
      .replace(/\/+$/, '');

    return `${url.protocol}//${url.host}${basePath}/api/${projectId}/envelope/`;
  } catch {
    return null;
  }
}

function sentryException(error: unknown) {
  if (error instanceof Error) {
    return {
      type: error.name || 'Error',
      value: error.message,
      stacktrace: stacktrace(error)
    };
  }

  return {
    type: 'Error',
    value: typeof error === 'string' ? error : 'Unexpected error'
  };
}

function stacktrace(error: Error) {
  const frames = error.stack
    ?.split('\n')
    .slice(1)
    .map((line) => ({ function: line.trim() }))
    .filter((frame) => frame.function);

  return frames?.length ? { frames } : undefined;
}

function redactContext(context: ErrorReportContext) {
  return Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => key !== 'error' && !isSensitiveKey(key))
      .map(([key, value]) => [key, safeValue(value)])
  );
}

function isSensitiveKey(key: string) {
  return /(token|secret|password|cookie|authorization|credential|dsn|code|state)/i.test(
    key
  );
}

function safeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }

  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(safeValue);
  }

  if (typeof value === 'object') {
    return redactContext(value as ErrorReportContext);
  }

  return String(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
