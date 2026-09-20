import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/rbac";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, details: details ?? undefined },
    { status }
  );
}

export function handleRouteError(err: unknown) {
  if (err instanceof AuthError) {
    return jsonError(err.message, err.status);
  }
  if (err instanceof ZodError) {
    return jsonError("Validation failed", 400, err.flatten());
  }
  if (err instanceof Error) {
    return jsonError(err.message, 400);
  }
  return jsonError("Unexpected server error", 500);
}
