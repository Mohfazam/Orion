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
      style={{
        flex: 3,
        background: "var(--bg-card)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-light)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--danger-bg)"
            }}
          >
            <AlertTriangle size={16} style={{ color: "var(--danger-dark)" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--text-main)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Findings
              </h2>
              <span
                style={{
                  fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                  background: "var(--danger-bg)", color: "var(--danger-dark)", border: "1px solid #FECACA"
                }}
              >
                {totalFindings}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
              Click any row to inspect
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {SEV_FILTERS.map((f) => {
            const sevKey = f.toLowerCase() as Severity;
            const dot = f === "All" ? "var(--primary)" : SEV[sevKey]?.color;
            const active = sevFilter === f;
            return (
              <button
                key={f}
                onClick={() => onSevFilterChange(f)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 9999,
                  transition: "all 0.15s", cursor: "pointer",
                  ...(active
                    ? { background: "var(--primary)", color: "var(--text-inverse)", boxShadow: "0 2px 8px rgba(37,99,235,0.28)", border: "1px solid var(--primary)" }
                    : { background: "var(--bg-muted)", color: "var(--text-muted)", border: "1px solid var(--border-muted)" })
                }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: active ? "#fff" : dot
                  }}
                />
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-subtle)" }}>
              {["Severity", "Title", "Agent", "Location", "Confidence"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700,
                    color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em",
                    borderBottom: "1px solid var(--border-light)", whiteSpace: "nowrap",
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
                <td colSpan={5} style={{ padding: "48px 16px", textAlign: "center", fontSize: 14, fontWeight: 500, color: "var(--text-dim)" }}>
                  No findings to display.
                </td>
              </tr>
            ) : (
              findings.map((f, i) => (
                <motion.tr
                  key={f.id || `finding-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onRowClick(f.id)}
                  style={{
                    borderBottom: i < findings.length - 1 ? "1px solid #F8FAFF" : "none",
                    transition: "background 0.13s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-muted)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <SeverityBadge severity={f.severity} />
                  </td>
                  <td style={{ padding: "13px 16px", minWidth: 200 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>
                      {f.title}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase",
                        background: "var(--primary-bg-alt)", color: "var(--primary-hover)"
                      }}
                    >
                      {f.agent || f.agentType}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", maxWidth: 160 }}>
                    <span
                      style={{
                        fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace",
                        display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}
                    >
                      {f.file}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    {f.confidence !== undefined ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 64, height: 6, borderRadius: 9999, overflow: "hidden",
                            background: "var(--border-muted)"
                          }}
                        >
                          <div
                            style={{
                              height: "100%", borderRadius: 9999,
                              width: `${f.confidence}%`,
                              background: SEV[f.severity]?.color || "var(--text-faint)"
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                          {f.confidence}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>N/A</span>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: "auto", borderTop: "1px solid var(--border-light)", background: "var(--bg-subtle)"
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Showing {findings.length} findings, Page {page}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--primary-bg-alt)", border: "1px solid var(--primary-border)",
              opacity: !hasPrev ? 0.5 : 1, cursor: !hasPrev ? "not-allowed" : "pointer"
            }}
          >
            <ChevronLeft size={13} style={{ color: "var(--primary)" }} />
          </button>
          <span style={{ padding: "0 8px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{page}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--primary-bg-alt)", border: "1px solid var(--primary-border)",
              opacity: !hasNext ? 0.5 : 1, cursor: !hasNext ? "not-allowed" : "pointer"
            }}
          >
            <ChevronRight size={13} style={{ color: "var(--primary)" }} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
