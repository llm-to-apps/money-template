import 'server-only';

import { reportErrorToSentry } from '@/server/error-reporting';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

export function logInfo(event: string, context: LogContext = {}) {
  writeLog('info', event, context);
}

export function logWarn(event: string, context: LogContext = {}) {
  writeLog('warn', event, context);
}

export function logError(event: string, context: LogContext = {}) {
  writeLog('error', event, context);
}

function writeLog(level: LogLevel, event: string, context: LogContext) {
  const payload = {
    app: 'money',
    event,
    level,
    message: event,
    timestamp: new Date().toISOString(),
    ...context
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    void reportErrorToSentry({
      context,
      error: context.error,
      event
    });
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}
