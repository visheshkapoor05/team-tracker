import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { removeHoliday } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    await removeHoliday(actingUser, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
