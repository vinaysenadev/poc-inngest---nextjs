import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { 
  processSearch, 
  processRefresh, 
  startExport, 
  processExportItem,
  processLongJob,
  handleGlobalFailure,
  processIdempotentAction
} from "@/lib/inngest/functions";

// Log initialization for debugging on Vercel
console.log(`[Inngest] Serve handler initialized in ${process.env.NODE_ENV} mode.`);

// Create an API that serves zero-downtime background functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processSearch,
    processRefresh,
    startExport,
    processExportItem,
    processLongJob,
    handleGlobalFailure,
    processIdempotentAction
  ],
});
