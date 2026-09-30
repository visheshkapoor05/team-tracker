import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listLeaves, setLeave } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const leaves = await listLeaves();
  return NextResponse.json({ leaves });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { profile_id, leave_date, type } = await req.json();
    const result = await setLeave(actingUser, profile_id, leave_date, type);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
