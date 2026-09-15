import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getOrgSettings, updateStaleTaskReminderDays } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const settings = await getOrgSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { stale_task_reminder_days } = await req.json();
    const settings = await updateStaleTaskReminderDays(actingUser, Number(stale_task_reminder_days));
    return NextResponse.json({ settings });
  } catch (e) {
    return handleApiError(e);
  }
}
