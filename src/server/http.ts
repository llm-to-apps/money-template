import { NextResponse } from 'next/server';

import type { ApiResponse, AppError } from '@/shared/api';
import { appErrorFromUnknown, errorStatus } from '@/shared/result';

export type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  AppError,
  AppErrorCode
} from '@/shared/api';

export function jsonError(error: AppError) {
  return NextResponse.json(
    {
      ok: false,
      error
    },
    { status: errorStatus(error.code) }
  );
}

export function jsonErrorFromUnknown(error: unknown, fallback?: string) {
  return jsonError(appErrorFromUnknown(error, fallback));
}

export function jsonOk<T>(data: T) {
  return NextResponse.json<ApiResponse<T>>({
    ok: true,
    data
  });
}
