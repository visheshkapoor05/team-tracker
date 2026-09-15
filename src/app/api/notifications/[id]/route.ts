import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { markNotificationRead } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    await markNotificationRead(actingUser, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
