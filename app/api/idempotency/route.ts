import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST() {
  const minuteBucket = Math.floor(Date.now() / 60000);
  const uniqueKey = `demo-idempotency-${minuteBucket}`;
  const events = [
    {
      name: "app/idempotency.demo",
      data: { key: uniqueKey },
    },
  ];

  await inngest.send(events);

  const { incrementJobCounter } = await import("@/lib/lock");
  await incrementJobCounter("idempotency", "totalRequests");

  return NextResponse.json({
    message: "Event dispatched to Inngest.",
    key: uniqueKey,
  });
}
