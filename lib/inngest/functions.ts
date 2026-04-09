import { inngest } from "./client";
import { unlock, saveJobResult } from "../lock";

export const processSearch = inngest.createFunction(
  { id: "process-search", triggers: [{ event: "app/search" }] },
  async ({ event, step }) => {
    const { query } = event.data as any;

    await step.sleep("simulate-search-delay", "15s");

    // Once finished, unlock the system so new APIs can trigger!

    await step.run("unlock-api", async () => {
      await saveJobResult("search", {
        query,
        mockResultsCount: Math.floor(Math.random() * 145) + 5,
        timestamp: new Date().toLocaleTimeString(),
      });
      await unlock("search");
    });
    return { status: "completed" };
  },
);

// Feature 2: Refresh (Idempotency)
export const processRefresh = inngest.createFunction(
  { id: "process-refresh", triggers: [{ event: "app/sync" }] },
  async ({ event, step }) => {
    await step.run("sync-database", async () => {
      // Simulate heavy database sync
      await new Promise((res) => setTimeout(res, 2000));
      return { syncedCount: 42 };
    });

    await step.run("unlock-api", async () => {
      await saveJobResult("sync", {
        syncedCount: 42,
        timestamp: new Date().toLocaleTimeString(),
      });
      await unlock("sync");
    });
    return { status: "synced" };
  },
);

// Feature 3: Export & Preview (Batch / Fan-out)
export const startExport = inngest.createFunction(
  { id: "start-export", triggers: [{ event: "app/export.start" }] },
  async ({ event, step }) => {
    const itemsToProcess = Array.from({ length: 100 }, (_, i) => ({
      name: "app/export.process.item",
      data: { index: i, originalEventId: event.id },
    }));

    await step.run("initialize-export-status", async () => {
      await saveJobResult("export", {
        succeeded: 0,
        failed: 0,
        total: 100,
        timestamp: new Date().toLocaleTimeString(),
      });
    });

    await step.sendEvent("fan-out-100-items", itemsToProcess);

    return { status: "fan-out-started", count: 100 };
  },
);

export const processExportItem = inngest.createFunction(
  {
    id: "process-export-item",
    triggers: [{ event: "app/export.process.item" }],
    // Configure 2 retries (3 total attempts) with exponential backoff
    retries: 2,
  },
  async ({ event, step }) => {
    const { index } = event.data as any;

    await step.run("process-item", async () => {
      // 15% failure rate for demonstration.
      // If it fails, Inngest will now automatically retry this worker.
      if (index % 7 === 0 || Math.random() < 0.15) {
        throw new Error(`Simulated error for item ${index}`);
      }
      return { success: true, processedItem: index };
    });

    // Only reached if the step above succeeds (on first try or after retries)
    await step.run("track-success", async () => {
      const { incrementJobCounter, unlock } = await import("../lock");
      const updatedDoc = await incrementJobCounter("export", "succeeded");
      if (updatedDoc) {
        const {
          succeeded = 0,
          failed = 0,
          total = 100,
        } = updatedDoc.result || {};
        if (succeeded + failed >= total) {
          await unlock("export");
        }
      }
    });

    return { index, status: "done" };
  },
);

// This handler runs ONLY if a function exhausts its retries.
export const handleGlobalFailure = inngest.createFunction(
  {
    id: "handle-global-failure",
    triggers: [{ event: "inngest/function.failed" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { function_id, error } = event.data;

    // 1. Special case: Export Batch items
    if (function_id.endsWith("process-export-item")) {
      await step.run("track-export-failure", async () => {
        const { incrementJobCounter, unlock } = await import("../lock");
        const updatedDoc = await incrementJobCounter("export", "failed");
        if (updatedDoc) {
          const {
            succeeded = 0,
            failed = 0,
            total = 100,
          } = updatedDoc.result || {};
          if (succeeded + failed >= total) {
            await unlock("export");
          }
        }
      });
    }

    // 2. Main Job Cleanup: Unlock and Log Error
    const cleanupMap: Record<string, string> = {
      "process-search": "search",
      "process-refresh": "sync",
      "process-long-job": "long-job",
    };

    for (const [fnId, lockId] of Object.entries(cleanupMap)) {
      if (function_id.endsWith(fnId)) {
        await step.run(`cleanup-${lockId}`, async () => {
          const { unlock, saveJobResult } = await import("../lock");
          await saveJobResult(lockId, {
            error: error.message || "Workflow exceeded retries",
            timestamp: new Date().toLocaleTimeString(),
          });
          await unlock(lockId);
        });
      }
    }
  },
);

// Feature 4: Long-running Jobs (2 Days)
export const processLongJob = inngest.createFunction(
  { id: "process-long-job", triggers: [{ event: "app/long.job" }] },
  async ({ event, step }) => {
    await step.run("start-job", async () => {
      return { message: "Job started, initializing state..." };
    });

    await step.sleep("wait-2-days", "1m");

    await step.run("finish-job", async () => {
      // Temporary simulated failure to verify logging
      if (Math.random() < 0.3) {
        throw new Error(
          "Simulated critical workflow failure during final stage",
        );
      }
      return {
        message: "Job resumed after exactly 2 days and is now finishing!",
      };
    });

    await step.run("unlock-api", async () => {
      await saveJobResult("long-job", {
        completed: true,
        dataPointsAnalyzed: Math.floor(Math.random() * 15000) + 5000,
        message: "Deep compute cycle finalized",
        timestamp: new Date().toLocaleTimeString(),
      });
      await unlock("long-job");
    });
    return { status: "long-job-completed" };
  },
);

// Feature 5: Idempotency Demo (Native Inngest)
export const processIdempotentAction = inngest.createFunction(
  { 
    id: "process-idempotency", 
    triggers: [{ event: "app/idempotency.demo" }],
    idempotency: "event.data.key",
  },
  async ({ event, step }) => {
    const { key } = event.data;

    // STEP 2: Proceed with work if unique
    await step.run("log-execution", async () => {
      const { incrementJobCounter, saveJobResult } = await import("../lock");
      
      await saveJobResult("idempotency", {
        key,
        executions: 0,
        timestamp: new Date().toLocaleTimeString()
      });

      await incrementJobCounter("idempotency", "executions");
    });

    await step.sleep("simulate-work", "10s");

    await step.run("unlock-api-ui", async () => {
      const { unlock } = await import("../lock");
      await unlock("idempotency");
    });

    return { status: "processed", key };
  }
);
