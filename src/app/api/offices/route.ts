import { NextResponse } from "next/server";
import { listOffices } from "@/lib/store/db";

export async function GET() {
  const offices = await listOffices();
  return NextResponse.json({ offices });
}
