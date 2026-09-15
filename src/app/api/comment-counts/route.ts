import { NextResponse } from "next/server";
import { listCommentCounts } from "@/lib/store/db";

export async function GET() {
  const counts = await listCommentCounts();
  return NextResponse.json({ counts });
}
