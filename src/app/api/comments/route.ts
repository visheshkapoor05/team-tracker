import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listComments, addComment } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  const comments = await listComments(taskId);
  return NextResponse.json({ comments });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { task_id, body } = await req.json();
    if (!body || !String(body).trim()) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
    }
    const comment = await addComment(actingUser, task_id, body);
    return NextResponse.json({ comment });
  } catch (e) {
    return handleApiError(e);
  }
}
