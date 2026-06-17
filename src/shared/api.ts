export type AppErrorCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

export type AppError = {
  code: AppErrorCode;
  details?: Record<string, unknown>;
  message: string;
};

export type ApiSuccessResponse<T> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: AppError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
