"use client";

import { motion } from "framer-motion";
import { SlidersHorizontal, GitBranch, MousePointer2, CheckCircle2, XCircle } from "lucide-react";

export const STATUS_FILTERS = ["All", "Queued", "Running", "Complete", "Failed"] as const;
export const MODE_FILTERS = ["All", "Manual", "CI"] as const;
export const PF_FILTERS = ["All", "Passed", "Failed"] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type ModeFilter = (typeof MODE_FILTERS)[number];
export type PFFilter = (typeof PF_FILTERS)[number];

export interface RunsFilterProps {
  statusFilter: StatusFilter;
  modeFilter: ModeFilter;
  passedFilter: PFFilter;
  onStatusChange: (s: StatusFilter) => void;
  onModeChange: (m: ModeFilter) => void;
  onPassedChange: (p: PFFilter) => void;
  totalCount: number;
}

export function RunsFilter({
  statusFilter,
  modeFilter,
  passedFilter,
  onStatusChange,
  onModeChange,
  onPassedChange,
  totalCount,
}: RunsFilterProps) {
  return (
    <motion.div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        flexWrap: "wrap", marginBottom: 18,
        padding: "14px 18px",
        background: "var(--bg-card)",
        borderRadius: 16,
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
        <SlidersHorizontal size={14} style={{ color: "var(--text-dim)" }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-faint)" }}>
          Filter
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: "var(--border-muted)", marginRight: 4 }} />

      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", marginRight: 2 }}>Status</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => onStatusChange(f === statusFilter ? "All" : f)}
            className={`pill-btn ${f === statusFilter ? "pill-active" : "pill-inactive"}`}
          >
            {f !== "All" && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: f === statusFilter ? "rgba(255,255,255,0.6)" : "var(--text-faint)", flexShrink: 0 }} />
            )}
            {f}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: "var(--border-muted)", margin: "0 4px" }} />

      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", marginRight: 2 }}>Mode</span>
        {MODE_FILTERS.map((f) => (
          <button 
            key={f} 
            onClick={() => onModeChange(f === modeFilter ? "All" : f)}
            className={`pill-btn ${f === modeFilter ? "pill-active" : "pill-inactive"}`}
          >
            {f === "CI" && <GitBranch size={10} />}
            {f === "Manual" && <MousePointer2 size={10} />}
            {f}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: "var(--border-muted)", margin: "0 4px" }} />

      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-faint)", marginRight: 2 }}>Result</span>
        {PF_FILTERS.map((f) => (
           <button 
             key={f} 
             onClick={() => onPassedChange(f === passedFilter ? "All" : f)}
             className={`pill-btn ${f === passedFilter ? "pill-active" : "pill-inactive"}`}
           >
             {f === "Passed" && <CheckCircle2 size={10} />}
             {f === "Failed" && <XCircle size={10} />}
             {f}
           </button>
        ))}
      </div>
    </motion.div>
  );
}
