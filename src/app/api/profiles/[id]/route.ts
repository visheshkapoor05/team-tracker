import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { updateProfileRole, updateProfileOffice } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";
import type { Role } from "@/lib/store/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    const body = (await req.json()) as { role?: Role; office_id?: string };
    let profile;
    if (body.role !== undefined) {
      profile = await updateProfileRole(actingUser, id, body.role);
    }
    if (body.office_id !== undefined) {
      profile = await updateProfileOffice(actingUser, id, body.office_id);
    }
    if (!profile) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    return NextResponse.json({ profile });
  } catch (e) {
    return handleApiError(e);
  }
}
