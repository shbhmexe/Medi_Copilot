import { NextResponse } from "next/server";
import { ApiSuccess, ApiError } from "@/types";

export function successResponse<T>(
  data: T,
  meta?: ApiSuccess<T>["meta"],
  status = 200
): NextResponse {
  return NextResponse.json({ success: true, data, meta } satisfies ApiSuccess<T>, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400
): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } } satisfies ApiError, { status });
}

export function unauthorizedResponse(): NextResponse {
  return errorResponse("UNAUTHORIZED", "Authentication required", 401);
}

export function forbiddenResponse(): NextResponse {
  return errorResponse("FORBIDDEN", "Insufficient permissions", 403);
}

export function notFoundResponse(entity = "Resource"): NextResponse {
  return errorResponse("NOT_FOUND", `${entity} not found`, 404);
}

export function serverErrorResponse(err?: unknown): NextResponse {
  console.error("Server error:", err);
  return errorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred. Please try again.",
    500
  );
}
