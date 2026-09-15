import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { decideBrand, renameBrand, deleteBrand } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    const { status, name } = (await req.json()) as {
      status?: "approved" | "rejected";
      name?: string;
    };
    const brand = status
      ? await decideBrand(actingUser, id, { status, name })
      : await renameBrand(actingUser, id, name ?? "");
    return NextResponse.json({ brand });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actingUser = await requireCurrentUser();
    await deleteBrand(actingUser, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
