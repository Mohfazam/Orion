"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RunDiff } from "../../../../types/orion";

export interface DiffPanelProps {
  diff: RunDiff;
}

export function DiffPanel({ diff }: DiffPanelProps) {
  const isRegression = diff.scoreDelta < 0;
  const isImprovement = diff.scoreDelta > 0;

  return (
    <motion.div
      style={{
        background: "var(--bg-card)",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div
        style={{
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)"
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: isRegression ? "var(--danger-bg)" : isImprovement ? "var(--success-bg)" : "var(--bg-muted)"
          }}
        >
          {isRegression ? (
            <TrendingDown size={16} style={{ color: "var(--danger-dark)" }} />
          ) : isImprovement ? (
            <TrendingUp size={16} style={{ color: "var(--success-dark)" }} />
          ) : (
            <Minus size={16} style={{ color: "var(--text-muted)" }} />
          )}
        </div>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--text-main)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Diff vs Previous Run
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
            Compared to {diff.previousRunId.slice(0, 8)}...
          </p>
        </div>
      </div>

      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div
          style={{ 
            gridColumn: "1 / -1",
            borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "flex-start",
            background: isRegression ? "var(--danger-bg)" : isImprovement ? "var(--success-bg)" : "var(--bg-muted)", 
            border: `1px solid ${isRegression ? "#FECACA" : isImprovement ? "#A7F3D0" : "var(--border-muted)"}` 
          }}
        >
          <div 
             style={{ 
               fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
               color: isRegression ? "#FCA5A5" : isImprovement ? "#6EE7B7" : "var(--text-faint)" 
             }}
          >
            Score Delta
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <span
              style={{ 
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800,
                fontSize: 42, lineHeight: 1, color: isRegression ? "var(--danger-dark)" : isImprovement ? "var(--success-dark)" : "var(--text-muted)" 
              }}
            >
              {diff.scoreDelta > 0 ? `+${diff.scoreDelta}` : diff.scoreDelta}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: isRegression ? "var(--danger)" : isImprovement ? "var(--success)" : "var(--text-dim)" }}>
              pts
            </span>
          </div>
        </div>

        {[
          {
            label: "New Findings",
            value: diff.newCount,
            icon: <AlertTriangle size={14} />,
            bg: "#FFF7ED", border: "#FED7AA", text: "#EA580C", muted: "#FDBA74",
          },
          {
            label: "Resolved",
            value: diff.resolvedCount,
            icon: <CheckCircle2 size={14} />,
            bg: "var(--success-bg)", border: "#A7F3D0", text: "var(--success-dark)", muted: "#6EE7B7",
          }
        ].map((s) => (
          <div
            key={s.label}
            style={{ borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", background: s.bg, border: `1px solid ${s.border}` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ color: s.muted, display: "flex" }}>{s.icon}</span>
              <span
                style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: s.muted }}
              >
                {s.label}
              </span>
            </div>
            <span
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 38, lineHeight: 1, color: s.text }}
            >
              {s.value}
            </span>
            <span style={{ fontSize: 12, marginTop: 6, fontWeight: 500, color: s.muted }}>
              findings
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
