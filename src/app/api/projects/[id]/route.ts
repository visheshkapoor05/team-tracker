import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { updateProject, deleteProject } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    const patch = await req.json();
    const project = await updateProject(actingUser, id, patch);
    return NextResponse.json({ project });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    await deleteProject(actingUser, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
