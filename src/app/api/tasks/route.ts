import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listVisibleTasks, createTask } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const actingUser = await requireCurrentUser();
  const tasks = await listVisibleTasks(actingUser);
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const body = await req.json();
    const task = await createTask(actingUser, body);
    return NextResponse.json({ task });
  } catch (e) {
    return handleApiError(e);
  }
}
