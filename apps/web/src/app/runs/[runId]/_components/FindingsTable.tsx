"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Finding, Severity } from "../../../../types/orion";
import { SEV, SeverityBadge } from "./FindingDrawer";

export const SEV_FILTERS = ["All", "Critical", "High", "Medium", "Low", "Info"] as const;
export type SevFilter = (typeof SEV_FILTERS)[number];

export interface FindingsTableProps {
  findings: Finding[];
  totalFindings: number;
  sevFilter: SevFilter;
  onSevFilterChange: (sev: SevFilter) => void;
  onRowClick: (findingId: string) => void;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (p: number) => void;
}

export function FindingsTable({
  findings,
  totalFindings,
  sevFilter,
  onSevFilterChange,
  onRowClick,
  page,
  hasNext,
  hasPrev,
  onPageChange
}: FindingsTableProps) {
  return (
    <motion.div
      className="xl:flex-[3] bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div
        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
        style={{ borderBottom: "1px solid #F1F5F9" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#FEF2F2" }}
          >
            <AlertTriangle size={16} style={{ color: "#DC2626" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="bricolage font-bold text-base" style={{ color: "#0F172A" }}>
                Findings
              </h2>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
              >
                {totalFindings}
              </span>
            </div>
            <p className="text-xs" style={{ color: "#94A3B8" }}>
              Click any row to inspect
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {SEV_FILTERS.map((f) => {
            const sevKey = f.toLowerCase() as Severity;
            const dot = f === "All" ? "#2563EB" : SEV[sevKey]?.color;
            const active = sevFilter === f;
            return (
              <button
                key={f}
                onClick={() => onSevFilterChange(f)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all"
                style={
                  active
                    ? { background: "#2563EB", color: "#fff", boxShadow: "0 2px 8px rgba(37,99,235,0.28)" }
                    : { background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }
                }
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: active ? "#fff" : dot }}
                />
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#FAFBFF" }}>
              {["Severity", "Title", "Agent", "Location", "Confidence"].map((h) => (
                <th
                  key={h}
                  className="text-left"
                  style={{
                    padding: "10px 16px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#94A3B8",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    borderBottom: "1px solid #F1F5F9",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {findings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm font-medium text-slate-400">
                  No findings to display.
                </td>
              </tr>
            ) : (
              findings.map((f, i) => (
                <motion.tr
                  key={f.id || `finding-${i}`}
                  className="row-hover"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onRowClick(f.id)}
                  style={{
                    borderBottom: i < findings.length - 1 ? "1px solid #F8FAFF" : "none",
                    transition: "background 0.13s",
                  }}
                >
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td style={{ padding: "13px 16px", minWidth: 200 }}>
                    <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>
                      {f.title}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md uppercase"
                      style={{ background: "#F0F5FF", color: "#1D4ED8" }}
                    >
                      {f.agentType}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", maxWidth: 160 }}>
                    <span
                      className="text-xs font-mono truncate block"
                      style={{ color: "#64748B" }}
                    >
                      {f.file}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    {f.confidence !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-16 h-1.5 rounded-full overflow-hidden"
                          style={{ background: "#E2E8F0" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(typeof f.confidence === 'number') ? f.confidence : (String(f.confidence).toLowerCase() === 'high' ? 90 : String(f.confidence).toLowerCase() === 'medium' ? 60 : 30)}%`,
                              background: SEV[f.severity]?.color || "#cbd5e1",
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold uppercase" style={{ color: "#475569" }}>
                          {typeof f.confidence === 'number' ? `${f.confidence}%` : f.confidence}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>N/A</span>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className="px-5 py-3.5 flex items-center justify-between mt-auto"
        style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFF" }}
      >
        <span className="text-xs" style={{ color: "#94A3B8" }}>
          Showing {findings.length} findings, Page {page}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "#F0F5FF", border: "1px solid #DBEAFE" }}
          >
            <ChevronLeft size={13} style={{ color: "#2563EB" }} />
          </button>
          <span className="px-2 text-xs font-semibold text-slate-500">{page}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "#F0F5FF", border: "1px solid #DBEAFE" }}
          >
            <ChevronRight size={13} style={{ color: "#2563EB" }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
