"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export interface LogEntry {
  timestamp: number;
  agent: string;
  message: string;
}

export interface LiveLogFeedProps {
  logs: LogEntry[];
}

export function LiveLogFeed({ logs }: LiveLogFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div
      className="bg-slate-900 rounded-2xl overflow-hidden flex flex-col"
      style={{ border: "1px solid #1E293B", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", height: 320 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: "1px solid #334155", background: "#0F172A" }}
      >
        <Terminal size={14} style={{ color: "#38BDF8" }} />
        <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
          Live Log Stream
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#22C55E" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22C55E" }} />
          </span>
          <span className="text-[10px] font-bold uppercase" style={{ color: "#22C55E" }}>Connected</span>
        </div>
      </div>

      {/* Logs feed */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs"
        style={{ color: "#CBD5E1" }}
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 italic">Waiting for agents to emit logs...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-3 leading-relaxed hover:bg-slate-800/50 px-2 py-1 -mx-2 rounded transition-colors">
              <span className="flex-shrink-0" style={{ color: "#64748B" }}>
                [{new Date(log.timestamp).toISOString().substring(11, 19)}]
              </span>
              <span className="flex-shrink-0 w-24 text-right" style={{ color: "#38BDF8" }}>
                {log.agent}
              </span>
              <span className="text-slate-300 break-words flex-1">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
