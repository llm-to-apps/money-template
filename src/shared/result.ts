import type { ApiResponse, AppError, AppErrorCode } from './api';

export type AppResult<T> = ApiResponse<T>;

export class AppException extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppException';
  }
}

export function throwAppError(code: AppErrorCode, message: string): never {
  throw new AppException(code, message);
}

export function ok<T>(data: T): AppResult<T> {
  return { ok: true, data };
}

export function fail(code: AppErrorCode, message: string): AppResult<never> {
  return {
    ok: false,
    error: { code, message }
  };
}

export function appErrorFromUnknown(
  error: unknown,
  fallback = 'Request failed'
): AppError {
  if (error instanceof AppException) {
    return {
      code: error.code,
      message: error.message
    };
  }

  return {
    code: inferErrorCode(error),
    message: error instanceof Error ? error.message : fallback
  };
}

export function errorStatus(code: AppErrorCode) {
  switch (code) {
    case 'UNAUTHORIZED':
      return 401;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    case 'BAD_REQUEST':
      return 400;
    case 'INTERNAL_ERROR':
      return 500;
  }
}

function inferErrorCode(error: unknown): AppErrorCode {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('unauthorized')) {
    return 'UNAUTHORIZED';
  }
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'NOT_FOUND';
  }
  if (
    message.includes('has transactions') ||
    message.includes('subcategories')
  ) {
    return 'CONFLICT';
  }

  return 'BAD_REQUEST';
}
