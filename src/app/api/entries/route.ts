import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listEntriesForTasks, setTaskHours, listVisibleTasks } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const actingUser = await requireCurrentUser();
  const tasks = await listVisibleTasks(actingUser);
  const entries = await listEntriesForTasks(tasks.map((t) => t.id));
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { task_id, entry_date, hours } = await req.json();
    const entry = await setTaskHours(actingUser, task_id, entry_date, Number(hours));
    return NextResponse.json({ entry });
  } catch (e) {
    return handleApiError(e);
  }
}
