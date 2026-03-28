import { NextResponse } from "next/server";

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  FieldError,
  PaginationLinks,
  PaginationMeta,
} from "@/types/api";

interface JsonSuccessOptions extends ResponseInit {
  links?: PaginationLinks;
  meta?: PaginationMeta;
}

interface JsonErrorOptions extends ResponseInit {
  code: string;
  details?: FieldError[];
  message: string;
}

export function jsonSuccess<T>(
  data: T,
  { headers, links, meta, status = 200 }: JsonSuccessOptions = {},
) {
  const responseBody: ApiSuccessResponse<T> = {
    data,
    ...(meta ? { meta } : {}),
    ...(links ? { links } : {}),
  };

  return NextResponse.json(responseBody, {
    headers,
    status,
  });
}

export function jsonError({
  code,
  details,
  headers,
  message,
  status,
}: JsonErrorOptions) {
  const responseBody: ApiErrorResponse = {
    error: {
      code,
      ...(details ? { details } : {}),
      message,
    },
  };

  return NextResponse.json(responseBody, {
    headers,
    status,
  });
}
