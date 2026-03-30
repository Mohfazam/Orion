"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, X, Globe, ArrowUpRight, BarChart2, Clock, Calendar, Eye } from "lucide-react";
import { Run } from "../../../../types/orion";
import { ScoreArc, scoreColor, formatDuration } from "./shared";
import { getScoreLabel } from "../../../../constants/orion";

export interface RunHeroProps {
  run: Run;
  onCancel: () => void;
}

export function RunHero({ run, onCancel }: RunHeroProps) {
  const sc = scoreColor(run.overallScore ?? 0);
  
  const findingsCount = run.summary?.bySeverity
    ? Object.values(run.summary.bySeverity).reduce((a, b: any) => a + (b || 0), 0)
    : (Array.isArray(run.findings) ? run.findings.length : 0);

  const durationMs = (run.completedAt && run.createdAt) 
    ? new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime() 
    : run.durationMs;

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div 
        className="dot-bg" 
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, opacity: 0.4, pointerEvents: "none" }} 
      />
      <div
        style={{
          position: "absolute",
          pointerEvents: "none",
          top: -100, right: -100,
          width: 500, height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sc.arc}22 0%, transparent 65%)`,
        }}
      />

      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
          
          <motion.div
            style={{ display: "flex", alignItems: "center", gap: 32 }}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <ScoreArc score={run.overallScore ?? 0} />

            <div>
              <motion.div
                style={{ 
                  fontFamily: "'Bricolage Grotesque', sans-serif", 
                  fontWeight: 800, 
                  lineHeight: 1.1, 
                  marginBottom: 4,
                  fontSize: "clamp(1.6rem, 4vw, 2.4rem)", 
                  color: sc.main 
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                {getScoreLabel(run.overallScore ?? 0)}
              </motion.div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, color: "var(--text-dim)" }}>
                Overall site health score
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {run.passed !== undefined && (
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: 14, fontWeight: 700, padding: "6px 14px", borderRadius: 9999,
                      background: run.passed ? "var(--success-bg)" : "var(--danger-bg)",
                      color: run.passed ? "var(--success-dark)" : "var(--danger-dark)",
                      border: `1.5px solid ${run.passed ? "#A7F3D0" : "#FECACA"}`,
                    }}
                  >
                    {run.passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    {run.passed ? "Passed" : "Failed"}
                  </span>
                )}
                {(run.status === "queued" || run.status === "running") && (
                  <button
                    onClick={onCancel}
                    style={{
                       display: "inline-flex", alignItems: "center", gap: 6,
                       fontSize: 14, fontWeight: 600, padding: "6px 14px", borderRadius: 9999,
                       background: "var(--danger-bg)", color: "var(--danger-dark)", border: "1.5px solid #FECACA",
                       cursor: "pointer"
                    }}
                  >
                    <X size={12} /> Cancel Run
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <div
            style={{ display: "block", alignSelf: "stretch", width: 1, background: "var(--border-subtle)", margin: "0 16px" }}
          />

          <motion.div
            style={{ flex: 1 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: 16, borderRadius: 16,
                background: "var(--bg-muted)", border: "1.5px solid var(--primary-border)"
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, background: "var(--primary-bg)", border: "1px solid var(--primary-border-light)"
                }}
              >
                <Globe size={18} style={{ color: "var(--primary)" }} />
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div
                  style={{
                    fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2,
                    color: "var(--text-dim)"
                  }}
                >
                  Audited URL
                </div>
                <div
                  style={{
                    fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    color: "var(--text-main)", fontFamily: "monospace"
                  }}
                >
                  {run.url}
                </div>
              </div>
              <a
                href={run.url.startsWith("http") ? run.url : `https://${run.url}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                   marginLeft: "auto", flexShrink: 0, width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-bg)", border: "1px solid var(--primary-border)"
                }}
              >
                <ArrowUpRight size={14} style={{ color: "var(--primary)" }} />
              </a>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              {[
                { icon: <BarChart2 size={14} />, label: "Findings", value: String(findingsCount), accent: sc.main },
                { icon: <Clock size={14} />,     label: "Duration", value: formatDuration(durationMs), accent: "var(--primary)" },
                { icon: <Calendar size={14} />,  label: "Started",  value: new Date(run.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), accent: "#7C3AED" },
                { icon: <Eye size={14} />,       label: "Run ID",   value: run.runId, accent: "#0891B2" },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{ 
                    borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 4,
                    background: "var(--bg-card)", border: "1px solid var(--border-light)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" 
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: m.accent, display: "flex" }}>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)" }}>
                      {m.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      color: "var(--text-main)", fontFamily: m.label === "Run ID" ? "monospace" : undefined
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
