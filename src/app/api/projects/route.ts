import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listProjects, createProject } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { name, start_date, end_date } = await req.json();
    const project = await createProject(actingUser, { name, start_date, end_date });
    return NextResponse.json({ project });
  } catch (e) {
    return handleApiError(e);
  }
}
