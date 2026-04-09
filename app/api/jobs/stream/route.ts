import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getAllJobStatuses } from "@/lib/lock";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendStatus = async () => {
        const statuses = await getAllJobStatuses();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(statuses)}\n\n`),
        );
      };

      // Send initial status
      await sendStatus();

      const client = await clientPromise;
      const collection = client.db("inngest-orchestrator").collection("locks");

      try {
        const changeStream = collection.watch([], {
          fullDocument: "updateLookup",
        });

        changeStream.on("change", async (change) => {
          await sendStatus();
        });

        const keepAliveInterval = setInterval(() => {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }, 15000);

        req.signal.addEventListener("abort", () => {
          clearInterval(keepAliveInterval);
          changeStream.close();
          controller.close();
        });
      } catch (e) {
        console.error(
          "Change streams not supported (Replica Set required). Falling back to server-side polling for SSE.",
        );

        const interval = setInterval(async () => {
          if (req.signal.aborted) {
            clearInterval(interval);
            controller.close();
            return;
          }
          await sendStatus();
        }, 2000);

        req.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
