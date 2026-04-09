"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  Clock,
  DollarSign,
  Database,
  X,
  RefreshCw,
  Trash2,
  Shield,
} from "lucide-react";

export default function App() {
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbData, setDbData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDbSnapshot = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await fetch("/api/jobs/status");
      const data = await res.json();
      setDbData(data);
    } catch (e) {
      console.error("Failed to fetch snapshot", e);
    } finally {
      setLoading(false);
    }
  };

  const cleanDatabase = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all job metadata and release all locks?",
      )
    )
      return;
    setLoading(true);
    try {
      await fetch("/api/jobs/reset", { method: "POST" });
      await fetchDbSnapshot();
      setMessages({});
    } catch (e) {
      console.error("Failed to clean database", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      fetchDbSnapshot();
    }
  }, [isModalOpen]);

  const formatJobMessage = useCallback((action: string, response: any) => {
    if (response.status === "running") return "Job running in background...";
    if (response.status === "idle") return "";

    const data = response.data;
    if (!data) return "";

    if (data.error) {
      return `❌ ${data.error} at ${data.timestamp}`;
    }

    switch (action) {
      case "search":
        return `✅ Found ${data.mockResultsCount} random results for "${data.query}" at ${data.timestamp}`;
      case "sync":
        return `✅ Synced ${data.syncedCount} items into your distributed cache at ${data.timestamp}`;
      case "export":
        const total = data.total || 100;
        const s = data.succeeded || 0;
        const f = data.failed || 0;
        const isDone = s + f >= total;
        return `${isDone ? "✅ " : "Processing: "}🟢 ${s} Success | 🔴 ${f} Failed (Total: ${total})`;
      case "long-job":
        return `✅ ${data.message} (${data.dataPointsAnalyzed?.toLocaleString() || 0} pts) at ${data.timestamp}`;
      case "idempotency":
        return `🛡️ Idempotency Verification: ${data.totalRequests || 0} API Requests received → ONLY ${data.executions || 0} unique execution(s). (Key: ${data.key})`;
      default:
        return "✅ Job completed";
    }
  }, []);

  // Server-Sent Events (SSE)
  useEffect(() => {
    const eventSource = new EventSource("/api/jobs/stream");

    eventSource.onmessage = (event) => {
      try {
        const statuses = JSON.parse(event.data);
        const updatedMessages: Record<string, string> = {};

        Object.keys(statuses).forEach((key) => {
          updatedMessages[key] = formatJobMessage(key, statuses[key]);
        });

        setMessages(updatedMessages);
      } catch (e) {
        console.error("Error parsing SSE data", e);
      }
    };

    eventSource.onerror = (e) => {
      console.error("SSE connection error", e);
      // EventSource will automatically retry in many cases
    };

    return () => {
      eventSource.close();
    };
  }, [formatJobMessage]);

  const handleAction = async (action: string, endpoint: string, body?: any) => {
    setMessages((prev) => ({ ...prev, [action]: "Triggering..." }));

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();

      if (res.status === 429) {
        setMessages((prev) => ({ ...prev, [action]: data.message }));
        return;
      }

      setMessages((prev) => ({
        ...prev,
        [action]: "Processing...",
      }));
    } catch (e) {
      setMessages((prev) => ({ ...prev, [action]: "Error executing action" }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-8 relative overflow-x-hidden">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 relative">
          <h1 className="text-5xl font-extrabold mb-4 glow-text">Nexoraa.ai</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Poc for distributed sysytem with Nextjs and Inngest
          </p>

          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium cursor-pointer"
          >
            <Database size={16} className="text-blue-400" />
            Inspect Database Snapshot
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feature 1: Search (Non-blocking) */}
          <div className="glass-card p-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <Search size={24} />
              </div>
              <h2 className="text-xl font-bold">Search Records</h2>
            </div>

            <div className="w-full flex flex-col gap-2 relative">
              <button
                onClick={() =>
                  handleAction("search", "/api/search", {
                    query: "Quantum computing",
                  })
                }
                className="w-full py-3 px-4 rounded-lg font-medium flex justify-center items-center gap-2 cursor-pointer bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:bg-blue-500/30 transition-all font-mono uppercase tracking-wider text-xs"
              >
                <span>Trigger Search </span>
              </button>
              {messages["search"] && (
                <p className="text-success text-xs font-mono bg-success/10 p-2 rounded w-full border border-success/20 text-center animate-in fade-in slide-in-from-top-1">
                  {messages["search"]}
                </p>
              )}
            </div>
          </div>

          {/* Feature 2: Sync */}
          <div className="glass-card p-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                <DollarSign size={24} />
              </div>
              <h2 className="text-xl font-bold">Sync Data</h2>
            </div>

            <div className="w-full flex flex-col gap-2 relative">
              <button
                onClick={() => handleAction("sync", "/api/sync")}
                className="w-full py-3 px-4 rounded-lg font-medium flex justify-center items-center gap-2 cursor-pointer bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 transition-all font-mono uppercase tracking-wider text-xs"
              >
                <span>Sync</span>
              </button>
              {messages["sync"] && (
                <p className="text-success text-xs font-mono bg-success/10 p-2 rounded w-full border border-success/20 text-center animate-in fade-in slide-in-from-top-1">
                  {messages["sync"]}
                </p>
              )}
            </div>
          </div>

          {/* Feature 3: Export */}
          <div className="glass-card p-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                <Download size={24} />
              </div>
              <h2 className="text-xl font-bold">Export Multiple Records</h2>
            </div>

            <div className="w-full flex flex-col gap-2 relative">
              <button
                onClick={() => handleAction("export", "/api/export")}
                className="w-full py-3 px-4 rounded-lg font-medium flex justify-center items-center gap-2 cursor-pointer bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:bg-purple-500/30 transition-all font-mono uppercase tracking-wider text-xs"
              >
                <span>Start Batch Export</span>
              </button>
              {messages["export"] && (
                <p className="text-success text-xs font-mono bg-success/10 p-2 rounded w-full border border-success/20 text-center animate-in fade-in slide-in-from-top-1">
                  {messages["export"]}
                </p>
              )}
            </div>
          </div>

          {/* Feature 4: Long-running Jobs */}
          <div className="glass-card p-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-3 rounded-lg bg-orange-500/20 text-orange-400">
                <Clock size={24} />
              </div>
              <h2 className="text-xl font-bold">Long Running Job</h2>
            </div>

            <div className="w-full flex flex-col gap-2 relative">
              <button
                onClick={() => handleAction("long-job", "/api/long-job")}
                className="w-full py-3 px-4 rounded-lg font-medium flex justify-center items-center gap-2 cursor-pointer bg-orange-500/20 text-orange-400 border border-orange-500/20 hover:bg-orange-500/30 transition-all font-mono uppercase tracking-wider text-xs"
              >
                <span>Start Long Job</span>
              </button>
              {messages["long-job"] && (
                <p className="text-success text-xs font-mono bg-success/10 p-2 rounded w-full border border-success/20 text-center animate-in fade-in slide-in-from-top-1">
                  {messages["long-job"]}
                </p>
              )}
            </div>
          </div>

          {/* Feature 5: Idempotency Protection */}
          <div className="glass-card p-6 flex flex-col items-start gap-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-3 rounded-lg bg-pink-500/20 text-pink-400">
                <Shield size={24} />
              </div>
              <h2 className="text-xl font-bold">Idempotency Demo</h2>
            </div>
            {/* <p className="text-slate-400 text-sm grow">
              Native deduplication. Triggering 3 simultaneous events with the same 
              key results in only ONE execution.
            </p> */}

            <div className="w-full flex flex-col gap-2 relative">
              <button
                onClick={() => handleAction("idempotency", "/api/idempotency")}
                className="w-full py-3 px-4 rounded-lg font-medium flex justify-center items-center gap-2 cursor-pointer bg-pink-500/20 text-pink-400 border border-pink-500/20 hover:bg-pink-500/30 transition-all font-mono uppercase tracking-wider text-xs"
              >
                <span>Trigger Unique Action</span>
              </button>
              {messages["idempotency"] && (
                <p className="text-success text-xs font-mono bg-success/10 p-2 rounded w-full border border-success/20 text-center animate-in fade-in slide-in-from-top-1">
                  {messages["idempotency"]}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-100 p-4 animate-in fade-in duration-300"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Database size={20} />
                </div>
                <h3 className="text-xl font-bold">MongoDB Raw Snapshot</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {loading && !dbData ? (
                <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                  <RefreshCw className="animate-spin text-blue-400" size={40} />
                  <p className="font-mono text-sm animate-pulse tracking-widest uppercase">
                    Querying Cluster...
                  </p>
                </div>
              ) : dbData ? (
                Object.entries(dbData).map(([key, val]: [string, any]) => (
                  <div
                    key={key}
                    className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3"
                  >
                    <div className="flex justify-between items-center bg-white/5 -m-4 p-4 rounded-t-xl mb-4 border-b border-white/5">
                      <span className="text-blue-400 font-bold uppercase tracking-tight text-sm font-mono">
                        {key}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          val.status === "running"
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/20 animate-pulse"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {val.status}
                      </span>
                    </div>
                    <pre className="text-[11px] text-slate-400 font-mono leading-relaxed overflow-x-auto p-2 custom-scrollbar">
                      {JSON.stringify(val.data || {}, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-500">
                  <p>
                    No active job metadata found in the orchestration layer.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 bg-white/5 flex justify-between items-center">
              {(() => {
                const isAnyJobRunning =
                  dbData &&
                  Object.values(dbData).some(
                    (val: any) => val.status === "running",
                  );
                return (
                  <button
                    onClick={() => cleanDatabase()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${
                      isAnyJobRunning || loading
                        ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                        : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 cursor-pointer"
                    }`}
                    disabled={!!isAnyJobRunning || loading}
                    title={
                      isAnyJobRunning
                        ? "Cannot clean database while jobs are running"
                        : ""
                    }
                  >
                    <Trash2 size={16} />
                    {isAnyJobRunning ? "Jobs Active..." : "Clean DB"}
                  </button>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => fetchDbSnapshot()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors text-sm font-bold shadow-lg shadow-blue-500/20 cursor-pointer"
                  disabled={loading}
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
