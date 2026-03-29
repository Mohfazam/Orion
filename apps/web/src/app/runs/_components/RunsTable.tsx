"use client";

import { motion } from "framer-motion";
import { Globe, Clock, ChevronRight, ChevronLeft, Search, Play, CheckCircle2, XCircle, MousePointer2, GitBranch } from "lucide-react";
import { Run } from "../../../types/orion";
import { formatDuration } from "../../_components/shared";
import { useRouter } from "next/navigation";

// --- specific stylings lifted from RUNS_PAGE ---
const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  complete: { label: "Complete", bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  running:  { label: "Running",  bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  queued:   { label: "Queued",   bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8" },
  failed:   { label: "Failed",   bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444" },
};

const MODE_STYLE: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  manual: { label: "Manual", bg: "#EFF6FF", text: "#1D4ED8", icon: <MousePointer2 size={11} /> },
  ci:     { label: "CI",     bg: "#F5F3FF", text: "#7C3AED", icon: <GitBranch size={11} />     },
};

function scoreStyle(score: number | null | undefined) {
  if (score === null || score === undefined) return { bg: "#F8FAFC", text: "#CBD5E1", border: "#E2E8F0" };
  if (score >= 90)   return { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" };
  if (score >= 70)   return { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" };
                     return { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" };
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.queued;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, fontWeight: 700,
        padding: "3px 10px", borderRadius: 999,
        background: s?.bg, color: s?.text,
        border: `1px solid ${s?.text}20`,
        whiteSpace: "nowrap",
      }}
    >
      <span className="relative flex" style={{ width: 7, height: 7 }}>
        {status === "running" && (
          <span
            style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: s?.dot, opacity: 0.5,
              animation: "ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
            }}
          />
        )}
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s?.dot, display: "block", position: "relative" }} />
      </span>
      {s?.label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const m = MODE_STYLE[mode] || { label: mode, bg: "#F8FAFC", text: "#64748B", icon: null };
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 700,
        padding: "3px 9px", borderRadius: 999,
        background: m.bg, color: m.text,
        border: `1px solid ${m.text}20`,
        textTransform: "capitalize"
      }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function ScoreChip({ score }: { score: number | null | undefined }) {
  const s = scoreStyle(score);
  return (
    <div
      style={{
        width: 42, height: 42, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: s.bg, color: s.text,
        border: `2px solid ${s.border}`,
        fontSize: 13, fontWeight: 800,
        fontFamily: "'Bricolage Grotesque', sans-serif",
        flexShrink: 0,
      }}
    >
      {score ?? "—"}
    </div>
  );
}

function PassFailBadge({ passed }: { passed: boolean | null | undefined }) {
  if (passed === null || passed === undefined) return <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>—</span>;
  return passed ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
      <CheckCircle2 size={11} /> Pass
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
      <XCircle size={11} /> Fail
    </span>
  );
}

function EmptyState({ onNewRun }: { onNewRun: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: "#EFF6FF", border: "2px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Search size={36} style={{ color: "#BFDBFE" }} />
        </div>
        {[[-22, -10], [18, -18], [-14, 18], [24, 14]].map(([x, y], i) => (
          <div key={i} style={{ position: "absolute", top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, width: 6, height: 6, borderRadius: "50%", background: i % 2 === 0 ? "#BFDBFE" : "#DDD6FE" }} />
        ))}
      </div>
      <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 17, color: "#0F172A", marginBottom: 8 }}>
        No runs match this filter
      </p>
      <p style={{ color: "#94A3B8", fontSize: 13, maxWidth: 300, lineHeight: 1.7, marginBottom: 24 }}>
        Try adjusting your filters or kick off a new audit to get started.
      </p>
      <button
        onClick={onNewRun}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 22px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(37,99,235,0.3)" }}
      >
        <Play size={13} style={{ fill: "#fff" }} /> Run your first audit
      </button>
    </div>
  );
}

export interface RunsTableProps {
  runs: Run[];
  isLoading: boolean;
  error: string | null;
  onNewRun: () => void;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  totalCount: number;
}

export function RunsTable({
  runs,
  isLoading,
  error,
  onNewRun,
  page,
  hasNext,
  hasPrev,
  onNextPage,
  onPrevPage,
  totalCount,
}: RunsTableProps) {
  const router = useRouter();

  const getDomain = (urlUrl: string) => {
      try {
          return new URL(urlUrl).hostname;
      } catch {
          return urlUrl;
      }
  }

  const getFormatDate = (dateString: string) => {
      if (!dateString) return "";
      const d = new Date(dateString);
      return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return (
    <motion.div
      style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #EFF3FB",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.45 }}
    >
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
             <p className="text-slate-500 font-semibold text-sm">Loading runs...</p>
        </div>
      ) : error ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
             <p className="text-red-500 font-semibold text-sm">{error}</p>
        </div>
      ) : runs.length === 0 ? (
        <EmptyState onNewRun={onNewRun} />
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#FAFBFF", borderBottom: "1px solid #F1F5F9" }}>
                  {["URL", "Mode", "Status", "Score", "Result", "Date", "Duration", ""].map((h, i) => (
                    <th
                      key={h || `header-${i}`}
                      style={{
                        padding: "11px 16px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => (
                  <motion.tr
                    key={run.id || run.runId || `run-${i}`}
                    className="row-hover"
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.06, duration: 0.35, ease: "easeOut" }}
                    style={{
                      borderBottom: i < runs.length - 1 ? "1px solid #F8FAFF" : "none",
                      transition: "background 0.13s",
                    }}
                    onClick={() => router.push(`/runs/${run.runId || run.id}`)}
                  >
                    {/* URL */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", border: "1px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Globe size={15} style={{ color: "#3B82F6" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {getDomain(run.url)}
                          </div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, fontFamily: "monospace", maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {run.url}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mode */}
                    <td style={{ padding: "14px 16px" }}>
                      <ModeBadge mode={run.mode || "manual"} />
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={run.status} />
                    </td>

                    {/* Score */}
                    <td style={{ padding: "14px 16px" }}>
                      <ScoreChip score={run.overallScore} />
                    </td>

                    {/* Pass/Fail */}
                    <td style={{ padding: "14px 16px" }}>
                      <PassFailBadge passed={run.passed} />
                    </td>

                    {/* Date */}
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Clock size={12} style={{ color: "#94A3B8" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                          {getFormatDate(run.createdAt)}
                        </span>
                      </div>
                    </td>

                    {/* Duration */}
                    <td style={{ padding: "14px 16px" }}>
                      {run.durationMs ? (
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 12, fontWeight: 600,
                            color: "#475569", fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatDuration(run.durationMs)}
                        </span>
                      ) : (
                        <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px 16px 14px 8px" }}>
                      <div
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          fontSize: 12, fontWeight: 700,
                          color: "#1D4ED8",
                          padding: "6px 14px", borderRadius: 10,
                          background: "#EFF6FF", border: "1px solid #DBEAFE",
                          textDecoration: "none",
                          transition: "all 0.13s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#DBEAFE"; e.currentTarget.style.borderColor = "#93C5FD"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.borderColor = "#DBEAFE"; }}
                      >
                        View <ChevronRight size={13} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 18px",
              borderTop: "1px solid #F1F5F9",
              background: "#FAFBFF",
              flexWrap: "wrap", gap: 12,
            }}
          >
            <span style={{ fontSize: 12, color: "#94A3B8" }}>
              Showing <strong style={{ color: "#475569" }}>{runs.length}</strong> of <strong style={{ color: "#475569" }}>{totalCount}</strong> runs
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={onPrevPage}
                disabled={!hasPrev}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0",
                  background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: hasPrev ? "pointer" : "not-allowed", opacity: hasPrev ? 1 : 0.45,
                }}
              >
                <ChevronLeft size={14} style={{ color: "#64748B" }} />
              </button>

              <button
                style={{
                  width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: "none",
                  background: "#2563EB",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }}
              >
                {page}
              </button>

              <button
                onClick={onNextPage}
                disabled={!hasNext}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: hasNext ? "1px solid #DBEAFE" : "1px solid #E2E8F0",
                  background: hasNext ? "#EFF6FF" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: hasNext ? "pointer" : "not-allowed", opacity: hasNext ? 1 : 0.45,
                }}
              >
                <ChevronRight size={14} style={{ color: hasNext ? "#2563EB" : "#64748B" }} />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
