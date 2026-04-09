import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { checkAndLock } from "@/lib/lock";

export async function POST(req: Request) {
  if (!(await checkAndLock("search"))) {
    return NextResponse.json({ message: "Search job is currently executing!" }, { status: 429 });
  }

  const { query } = await req.json();

  // Send the event to Inngest. This immediately returns and does not block.
  await inngest.send({
    name: "app/search",
    data: { query },
  });

  // Return a 202 Accepted, indicating the request has been accepted for processing.
  return NextResponse.json({ message: "Search job queued successfully" }, { status: 202 });
}
