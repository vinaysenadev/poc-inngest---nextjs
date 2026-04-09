import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { checkAndLock } from "@/lib/lock";

export async function POST(req: Request) {
  if (!(await checkAndLock("export"))) {
    return NextResponse.json({ message: "Export batch is currently executing!" }, { status: 429 });
  }
  // Start the export. The Inngest function will then fan-out to 1000 smaller events!
  await inngest.send({
    name: "app/export.start",
    data: { timestamp: new Date().toISOString() },
  });

  return NextResponse.json({ message: "Export batch job started successfully" });
}
