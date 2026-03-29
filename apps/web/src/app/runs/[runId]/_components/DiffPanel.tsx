"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RunDiff } from "../../../../types/orion";

export interface DiffPanelProps {
  diff: RunDiff;
}

export function DiffPanel({ diff }: DiffPanelProps) {
  const isRegression = diff.verdict === "regression";
  const isImprovement = diff.verdict === "improvement";

  return (
    <motion.div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFBFF" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: isRegression ? "#FEF2F2" : isImprovement ? "#ECFDF5" : "#F8FAFC" }}
        >
          {isRegression ? (
            <TrendingDown size={16} style={{ color: "#DC2626" }} />
          ) : isImprovement ? (
            <TrendingUp size={16} style={{ color: "#059669" }} />
          ) : (
            <Minus size={16} style={{ color: "#64748B" }} />
          )}
        </div>
        <div>
          <h2 className="bricolage font-bold text-base" style={{ color: "#0F172A" }}>
            Diff vs Previous Run
          </h2>
          <p className="text-xs" style={{ color: "#94A3B8" }}>
            Compared to {diff.previousRunId.slice(0, 8)}... (Δ {diff.scoreDifference})
          </p>
        </div>

        <span
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full"
          style={{
            background: isRegression ? "#FEF2F2" : isImprovement ? "#ECFDF5" : "#F8FAFC",
            color: isRegression ? "#DC2626" : isImprovement ? "#059669" : "#64748B",
            border: `1.5px solid ${isRegression ? "#FECACA" : isImprovement ? "#A7F3D0" : "#E2E8F0"}`,
          }}
        >
          {isRegression ? (
            <><ArrowDownRight size={14} /> Regression</>
          ) : isImprovement ? (
            <><ArrowUpRight size={14} /> Improvement</>
          ) : (
            <><Minus size={14} /> Unchanged</>
          )}
        </span>
      </div>

      <div className="px-5 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="col-span-2 lg:col-span-1 rounded-2xl p-4 flex flex-col items-start"
          style={{ 
            background: isRegression ? "#FEF2F2" : isImprovement ? "#ECFDF5" : "#F8FAFC", 
            border: `1px solid ${isRegression ? "#FECACA" : isImprovement ? "#A7F3D0" : "#E2E8F0"}` 
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-2" 
               style={{ color: isRegression ? "#FCA5A5" : isImprovement ? "#6EE7B7" : "#CBD5E1" }}>
            Score Delta
          </div>
          <div className="flex items-end gap-2">
            <span
              className="bricolage font-extrabold"
              style={{ fontSize: 42, lineHeight: 1, color: isRegression ? "#DC2626" : isImprovement ? "#059669" : "#64748B" }}
            >
              {diff.scoreDelta > 0 ? `+${diff.scoreDelta}` : diff.scoreDelta}
            </span>
            <span className="text-sm font-semibold mb-1" style={{ color: isRegression ? "#EF4444" : isImprovement ? "#10B981" : "#94A3B8" }}>
              pts
            </span>
          </div>
        </div>

        {[
          {
            label: "New Findings",
            value: diff.newFindingsCount,
            icon: <AlertTriangle size={14} />,
            bg: "#FFF7ED", border: "#FED7AA", text: "#EA580C", muted: "#FDBA74",
          },
          {
            label: "Resolved",
            value: diff.resolvedFindingsCount,
            icon: <CheckCircle2 size={14} />,
            bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", muted: "#6EE7B7",
          },
          {
            label: "Unchanged",
            value: diff.unchangedFindingsCount,
            icon: <Minus size={14} />,
            bg: "#F8FAFC", border: "#E2E8F0", text: "#64748B", muted: "#CBD5E1",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4 flex flex-col"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <span style={{ color: s.muted }}>{s.icon}</span>
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: s.muted }}
              >
                {s.label}
              </span>
            </div>
            <span
              className="bricolage font-extrabold"
              style={{ fontSize: 38, lineHeight: 1, color: s.text }}
            >
              {s.value}
            </span>
            <span className="text-xs mt-1.5 font-medium" style={{ color: s.muted }}>
              findings
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
