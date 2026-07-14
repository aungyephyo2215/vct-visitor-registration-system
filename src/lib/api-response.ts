import { NextResponse } from "next/server";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { message, ...(details ? { details } : {}) } },
    { status },
  );
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: { message } }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ success: false, error: { message } }, { status: 403 });
}

export function notFoundResponse(message = "Not found") {
  return NextResponse.json({ success: false, error: { message } }, { status: 404 });
}

export function validationErrorResponse(errors: unknown) {
  return NextResponse.json(
    { success: false, error: { message: "Validation failed", details: errors } },
    { status: 422 },
  );
}
