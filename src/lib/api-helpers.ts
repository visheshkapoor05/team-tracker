import { NextResponse } from "next/server";
import { ForbiddenError } from "./store/db";

export function handleApiError(e: unknown) {
  if (e instanceof ForbiddenError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const message = e instanceof Error ? e.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 400 });
}
