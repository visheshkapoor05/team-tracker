import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listHolidays, addHoliday } from "@/lib/store/db";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const holidays = await listHolidays();
  return NextResponse.json({ holidays });
}

export async function POST(req: Request) {
  try {
    const actingUser = await requireCurrentUser();
    const { office_id, holiday_date, label } = await req.json();
    const holiday = await addHoliday(actingUser, { office_id, holiday_date, label: label ?? "" });
    return NextResponse.json({ holiday });
  } catch (e) {
    return handleApiError(e);
  }
}
