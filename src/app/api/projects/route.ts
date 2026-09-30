import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listVisibleProjects, createProject } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const actingUser = await requireCurrentUser();
    const projects = await listVisibleProjects(actingUser);
    return NextResponse.json({ projects });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { name, start_date, end_date, owner_id } = await req.json();
    const project = await createProject(actingUser, { name, start_date, end_date, owner_id });
    return NextResponse.json({ project });
  } catch (e) {
    return handleApiError(e);
  }
}
