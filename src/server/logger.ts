import 'server-only';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

export function logInfo(message: string, context: LogContext = {}) {
  writeLog('info', message, context);
}

export function logWarn(message: string, context: LogContext = {}) {
  writeLog('warn', message, context);
}

export function logError(message: string, context: LogContext = {}) {
  writeLog('error', message, context);
}

function writeLog(level: LogLevel, message: string, context: LogContext) {
  const payload = {
    app: 'money',
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}
