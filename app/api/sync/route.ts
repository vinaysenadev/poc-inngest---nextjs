import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { checkAndLock } from "@/lib/lock";

export async function POST(req: Request) {
  if (!(await checkAndLock("sync"))) {
    return NextResponse.json(
      { message: "Sync job is currently executing!" },
      { status: 429 },
    );
  }

  await inngest.send({
    name: "app/sync",
    data: {},
  });

  return NextResponse.json({ message: "Sync event dispatched." });
}
