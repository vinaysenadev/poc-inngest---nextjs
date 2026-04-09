import { NextResponse } from "next/server";
import { getAllJobStatuses } from "@/lib/lock";

export async function GET() {
  const statuses = await getAllJobStatuses();
  return NextResponse.json(statuses);
}
