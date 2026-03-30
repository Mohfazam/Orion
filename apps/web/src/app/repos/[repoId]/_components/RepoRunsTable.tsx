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
  complete: { label: "Complete", bg: "var(--primary-bg)", text: "var(--primary-hover)", dot: "var(--primary-light)" },
  running:  { label: "Running",  bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  queued:   { label: "Queued",   bg: "var(--bg-muted)", text: "var(--text-muted)", dot: "var(--text-dim)" },
  failed:   { label: "Failed",   bg: "var(--danger-bg)", text: "var(--danger-dark)", dot: "var(--danger)" },
};

const TRIGGER_STYLE: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  ci:        { label: "Push",      bg: "var(--primary-bg)", text: "var(--primary-hover)", icon: <GitCommit size={10} /> },
  manual:    { label: "Manual",    bg: "#F0FDF4", text: "var(--success-dark)", icon: <Play size={10} />       },
  api:       { label: "Scheduled", bg: "#FFF7ED", text: "#C2410C", icon: <Clock size={10} />      },
};

function scoreStyle(score: number | null | undefined) {
  if (score === null || score === undefined) return { main: "var(--text-faint)", light: "var(--bg-muted)", border: "var(--border-muted)" };
  if (score >= 90)   return { main: "var(--success-dark)", light: "var(--success-bg)", border: "#A7F3D0" };
  if (score >= 70)   return { main: "var(--warn)", light: "var(--warn-bg)", border: "#FDE68A" };
                     return { main: "var(--danger-dark)", light: "var(--danger-bg)", border: "#FECACA" };
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
  if (passed === null || passed === undefined) return <span style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 600 }}>—</span>;
  return passed ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--success-bg)", color: "var(--success-dark)", border: "1px solid #A7F3D0" }}><CheckCircle2 size={10} /> Pass</span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--danger-bg)", color: "var(--danger-dark)", border: "1px solid #FECACA" }}><XCircle size={10} /> Fail</span>
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
      <div style={{ width: 80, height: 80, borderRadius: 24, background: "var(--primary-bg)", border: "2px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
        <Activity size={30} style={{ color: "#93C5FD" }} />
      </div>
      <p className="bricolage" style={{ fontWeight: 700, fontSize: 17, color: "var(--text-main)", marginBottom: 8 }}>No runs for this repo yet</p>
      <p style={{ color: "var(--text-dim)", fontSize: 13, maxWidth: 300, lineHeight: 1.75, marginBottom: 22 }}>
        Trigger your first audit to start monitoring this repository's staging environment.
      </p>
      <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--primary)", color: "var(--text-inverse)", fontWeight: 700, fontSize: 13, padding: "10px 22px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 2px 12px rgba(37,99,235,0.3)" }}>
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
      style={{ background: "var(--bg-card)", borderRadius: 20, border: "1px solid var(--border-subtle)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.45 }}
    >
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--primary-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={15} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h2 className="bricolage" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Audit Runs</h2>
            <p style={{ fontSize: 11, color: "var(--text-dim)" }}>{runs.length} runs · sorted by recency</p>
          </div>
        </div>
        <button 
           onClick={onNewRun}
           style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary-bg)", color: "var(--primary-hover)", fontWeight: 700, fontSize: 12, padding: "7px 14px", borderRadius: 10, border: "1.5px solid var(--primary-border-light)", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <Play size={11} style={{ fill: "var(--primary-hover)" }} /> New Run
        </button>
      </div>

      {runs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-light)" }}>
                  {["Run ID", "Status", "Score", "Result", "Trigger", "Date", "Duration", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
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
                      key={run.runId || run.id || `run-${i}`}
                      className="row-hover"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.26 + i * 0.06, duration: 0.32 }}
                      style={{ borderBottom: i < runs.length - 1 ? "1px solid #F8FAFF" : "none", transition: "background 0.12s" }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary-bg-alt)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Activity size={13} style={{ color: "var(--primary-light)" }} />
                          </div>
                          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
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
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: "var(--bg-muted)", border: "1px solid var(--border-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Clock size={11} style={{ color: "var(--text-dim)" }} />
                          </div>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{getFormatDate(run.createdAt)}</span>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {durStr
                          ? <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", fontVariantNumeric: "tabular-nums" }}>{durStr}</span>
                          : <span style={{ color: "var(--text-faint)", fontSize: 13 }}>—</span>
                        }
                      </td>

                      <td style={{ padding: "14px 16px 14px 8px" }}>
                        <Link
                          href={`/runs/${run.runId}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--primary-hover)", padding: "6px 13px", borderRadius: 9, background: "var(--primary-bg)", border: "1px solid var(--primary-border-light)", textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.12s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--primary-border)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--primary-bg)"; }}
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid var(--border-light)", background: "var(--bg-subtle)", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
              Showing <strong style={{ color: "var(--text-main)" }}>{runs.length}</strong> of <strong style={{ color: "var(--text-main)" }}>{runs.length}</strong> runs
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button disabled style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid var(--border-muted)", background: "var(--bg-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "not-allowed", opacity: 0.45 }}>
                <ChevronLeft size={13} style={{ color: "var(--text-muted)" }} />
              </button>
              {[1].map(p => (
                <button key={p} style={{ width: 30, height: 30, borderRadius: 7, fontSize: 12, fontWeight: 700, border: p === 1 ? "none" : "1px solid var(--border-muted)", background: p === 1 ? "var(--primary)" : "var(--bg-muted)", color: p === 1 ? "#fff" : "var(--text-muted)", cursor: "pointer", boxShadow: p === 1 ? "0 2px 8px rgba(37,99,235,0.22)" : "none" }}>
                  {p}
                </button>
              ))}
              <button disabled style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid var(--primary-border)", background: "var(--primary-bg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "not-allowed", opacity: 0.45 }}>
                <ChevronRight size={13} style={{ color: "var(--primary)" }} />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
