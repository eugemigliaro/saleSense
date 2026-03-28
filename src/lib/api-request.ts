import { ZodError } from "zod";

import { jsonError } from "@/lib/api-response";
import type { FieldError } from "@/types/api";

const INVALID_JSON_MESSAGE = "Malformed JSON request body.";

export class InvalidJsonBodyError extends Error {
  constructor(message = INVALID_JSON_MESSAGE) {
    super(message);
    this.name = "InvalidJsonBodyError";
  }
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export function getValidationDetails(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    code: issue.code,
    field: issue.path.length > 0 ? issue.path.map(String).join(".") : "body",
    message: issue.message,
  }));
}

export function jsonInvalidJsonError() {
  return jsonError({
    code: "invalid_json",
    message: INVALID_JSON_MESSAGE,
    status: 400,
  });
}

export function jsonNotFoundError(message = "Resource not found.") {
  return jsonError({
    code: "not_found",
    message,
    status: 404,
  });
}

export function jsonServerError(message = "Unexpected server error.") {
  return jsonError({
    code: "internal_error",
    message,
    status: 500,
  });
}

export function jsonUnauthorizedError(
  message = "Seller authentication required.",
) {
  return jsonError({
    code: "unauthorized",
    message,
    status: 401,
  });
}

export function jsonValidationError(error: ZodError) {
  return jsonError({
    code: "validation_error",
    details: getValidationDetails(error),
    message: "Request validation failed.",
    status: 422,
  });
}
