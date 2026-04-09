import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { checkAndLock } from "@/lib/lock";

export async function POST(req: Request) {
  if (!(await checkAndLock("long-job"))) {
    return NextResponse.json({ message: "Long job is currently executing!" }, { status: 429 });
  }
  await inngest.send({
    name: "app/long.job",
    data: { timestamp: new Date().toISOString() },
  });

  return NextResponse.json({ message: "2-Day Long job started successfully!" });
}
