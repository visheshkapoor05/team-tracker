import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listNotifications, markAllNotificationsRead } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const actingUser = await requireCurrentUser();
  const notifications = await listNotifications(actingUser);
  return NextResponse.json({ notifications });
}

export async function PATCH() {
  try {
    const actingUser = await requireCurrentUser();
    await markAllNotificationsRead(actingUser);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
