"use client";

import { motion } from "framer-motion";
import { Activity, Play, CheckCircle2, XCircle, Clock, ChevronRight, ChevronLeft, GitCommit } from "lucide-react";
import { Run, RunStatus } from "../../../../types/orion";
import Link from "next/link";

export interface RepoRunsTableProps {
  runs: Run[];
  onNewRun?: () => void;
}

const STATUS_STYLE: Record<RunStatus, { label: string; bg: string; text: string; dot: string }> = {
  complete: { label: "Complete", bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  running:  { label: "Running",  bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  queued:   { label: "Queued",   bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8" },
  failed:   { label: "Failed",   bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444" },
};

const TRIGGER_STYLE: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  ci:        { label: "Push",      bg: "#EFF6FF", text: "#1D4ED8", icon: <GitCommit size={10} /> },
  manual:    { label: "Manual",    bg: "#F0FDF4", text: "#059669", icon: <Play size={10} />       },
  api:       { label: "Scheduled", bg: "#FFF7ED", text: "#C2410C", icon: <Clock size={10} />      },
};

function scoreStyle(score: number | null | undefined) {
  if (score === null || score === undefined) return { main: "#CBD5E1", light: "#F8FAFC", border: "#E2E8F0" };
  if (score >= 90)   return { main: "#059669", light: "#ECFDF5", border: "#A7F3D0" };
  if (score >= 70)   return { main: "#D97706", light: "#FFFBEB", border: "#FDE68A" };
                     return { main: "#DC2626", light: "#FEF2F2", border: "#FECACA" };
}

function StatusBadge({ status }: { status: RunStatus }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.queued;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.text, border: `1px solid ${s.text}20`, whiteSpace: "nowrap" }}>
      <span style={{ position: "relative", display: "flex", width: 7, height: 7 }}>
        {status === "running" && <span className="ping-dot" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: s.dot, opacity: 0.5 }} />}
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "block", position: "relative" }} />
      </span>
      {s.label}
    </span>
  );
}

function PassFailBadge({ passed }: { passed: boolean | null | undefined }) {
  if (passed === null || passed === undefined) return <span style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>—</span>;
  return passed ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}><CheckCircle2 size={10} /> Pass</span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}><XCircle size={10} /> Fail</span>
  );
}

function ScoreChip({ score }: { score: number | null | undefined }) {
  const s = scoreStyle(score);
  return (
    <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: s.light, border: `2px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 13, fontWeight: 800, color: s.main }}>
      {(score === null || score === undefined) ? "—" : score}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: "#EFF6FF", border: "2px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <Activity size={30} style={{ color: "#93C5FD" }} />
      </div>
      <p className="bricolage" style={{ fontWeight: 700, fontSize: 17, color: "#0F172A", marginBottom: 8 }}>No runs for this repo yet</p>
      <p style={{ color: "#94A3B8", fontSize: 13, maxWidth: 300, lineHeight: 1.75, marginBottom: 22 }}>
        Trigger your first audit to start monitoring this repository's staging environment.
      </p>
      <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, padding: "10px 22px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(37,99,235,0.3)" }}>
        <Play size={13} style={{ fill: "#fff" }} /> Run Analysis
      </button>
    </div>
  );
}

export function RepoRunsTable({ runs, onNewRun }: Readonly<RepoRunsTableProps>) {
  
  const getFormatDate = (dateString: string) => {
      if (!dateString) return "—";
      const d = new Date(dateString);
      return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  const getFormatDuration = (ms: number | undefined) => {
      if (!ms) return null;
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes === 0) return `${seconds}s`;
      return `${minutes}m ${seconds}s`;
  }

  return (
    <motion.div
      style={{ background: "#fff", borderRadius: 20, border: "1px solid #EFF3FB", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.45 }}
    >
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFBFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={15} style={{ color: "#2563EB" }} />
          </div>
          <div>
            <h2 className="bricolage" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Audit Runs</h2>
            <p style={{ fontSize: 11, color: "#94A3B8" }}>{runs.length} runs · sorted by recency</p>
          </div>
        </div>
        <button 
           onClick={onNewRun}
           style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 10, border: "1.5px solid #BFDBFE", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <Play size={11} style={{ fill: "#1D4ED8" }} /> New Run
        </button>
      </div>

      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#FAFBFF", borderBottom: "1px solid #F1F5F9" }}>
                  {["Run ID", "Status", "Score", "Result", "Trigger", "Date", "Duration", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => {
                  const styleMatch = TRIGGER_STYLE[run.mode || "manual"];
                  const tr = (styleMatch ? styleMatch : TRIGGER_STYLE.manual) as { label: string; bg: string; text: string; icon: React.ReactNode };
                  const durStr = getFormatDuration(run.durationMs);

                  return (
                    <motion.tr
                      key={run.id}
                      className="row-hover"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.26 + i * 0.06, duration: 0.32 }}
                      style={{ borderBottom: i < runs.length - 1 ? "1px solid #F8FAFF" : "none", transition: "background 0.12s" }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#F0F5FF", border: "1px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Activity size={13} style={{ color: "#3B82F6" }} />
                          </div>
                          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "#2563EB" }}>
                            {run.runId.substring(0, 8)}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}><StatusBadge status={run.status} /></td>

                      <td style={{ padding: "14px 16px" }}><ScoreChip score={run.overallScore} /></td>

                      <td style={{ padding: "14px 16px" }}><PassFailBadge passed={run.passed} /></td>

                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: tr.bg, color: tr.text }}>
                          {tr.icon} {tr.label}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Clock size={11} style={{ color: "#94A3B8" }} />
                          </div>
                          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{getFormatDate(run.createdAt)}</span>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {durStr
                          ? <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{durStr}</span>
                          : <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>
                        }
                      </td>

                      <td style={{ padding: "14px 16px 14px 8px" }}>
                        <Link
                          href={`/runs/${run.runId}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#1D4ED8", padding: "6px 13px", borderRadius: 9, background: "#EFF6FF", border: "1px solid #BFDBFE", textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
                        >
                          View <ChevronRight size={12} />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid #F1F5F9", background: "#FAFBFF", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>
              Showing <strong style={{ color: "#475569" }}>{runs.length}</strong> of <strong style={{ color: "#475569" }}>{runs.length}</strong> runs
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button disabled style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "not-allowed", opacity: 0.45 }}>
                <ChevronLeft size={13} style={{ color: "#64748B" }} />
              </button>
              {[1].map(p => (
                <button key={p} style={{ width: 30, height: 30, borderRadius: 7, fontSize: 12, fontWeight: 700, border: p === 1 ? "none" : "1px solid #E2E8F0", background: p === 1 ? "#2563EB" : "#F8FAFC", color: p === 1 ? "#fff" : "#64748B", cursor: "pointer", boxShadow: p === 1 ? "0 2px 8px rgba(37,99,235,0.22)" : "none" }}>
                  {p}
                </button>
              ))}
              <button disabled style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #DBEAFE", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "not-allowed", opacity: 0.45 }}>
                <ChevronRight size={13} style={{ color: "#2563EB" }} />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
