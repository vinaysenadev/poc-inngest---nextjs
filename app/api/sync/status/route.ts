import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/lock";

export async function GET() {
  const status = await getJobStatus("sync");
  return NextResponse.json(status);
}
