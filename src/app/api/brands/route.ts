import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listBrands, requestBrand, addApprovedBrand } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const brands = await listBrands();
  return NextResponse.json({ brands });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { name } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }
    // Managers don't need to request-and-approve their own brands.
    const brand =
      actingUser.role === "manager"
        ? await addApprovedBrand(actingUser, name)
        : await requestBrand(actingUser, name);
    return NextResponse.json({ brand });
  } catch (e) {
    return handleApiError(e);
  }
}
