"use client";

import { motion } from "framer-motion";
import { BarChart2, CheckCircle2, XCircle, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { getScoreColor } from "../../../../constants/orion";

export interface RepoStatsProps {
  totalRuns: number;
  passed: number;
  failed: number;
  avgScore: number | null;
}

function scoreStyle(score: number | null) {
  if (score === null || score === undefined || isNaN(score)) return { main: "#CBD5E1", light: "#F8FAFC", border: "#E2E8F0" };
  if (score >= 90)   return { main: "#059669", light: "#ECFDF5", border: "#A7F3D0" };
  if (score >= 70)   return { main: "#D97706", light: "#FFFBEB", border: "#FDE68A" };
                     return { main: "#DC2626", light: "#FEF2F2", border: "#FECACA" };
}

export function RepoStats({ totalRuns, passed, failed, avgScore }: RepoStatsProps) {
  const avgSc = scoreStyle(avgScore);
  const passRate = totalRuns > 0 ? Math.round((passed / totalRuns) * 100) : 0;
  const failRate = totalRuns > 0 ? Math.round((failed / totalRuns) * 100) : 0;

  return (
    <motion.div
      style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.42 }}
    >
      {[
        {
          label: "Total Runs",
          value: totalRuns,
          icon: <BarChart2 size={16} />,
          accent: "#2563EB",
          bg: "#EFF6FF",
          border: "#DBEAFE",
          sub: "All time",
          subColor: "#93C5FD",
          trend: null,
        },
        {
          label: "Passed",
          value: passed,
          icon: <CheckCircle2 size={16} />,
          accent: "#059669",
          bg: "#ECFDF5",
          border: "#A7F3D0",
          sub: `${passRate}% pass rate`,
          subColor: "#34D399",
          trend: "up",
        },
        {
          label: "Failed",
          value: failed,
          icon: <XCircle size={16} />,
          accent: "#DC2626",
          bg: "#FEF2F2",
          border: "#FECACA",
          sub: `${failRate}% fail rate`,
          subColor: "#FCA5A5",
          trend: "down",
        },
        {
          label: "Avg Score",
          value: avgScore === null || isNaN(avgScore as number) ? "—" : avgScore,
          icon: <Zap size={16} />,
          accent: avgSc.main,
          bg: avgSc.light,
          border: avgSc.border,
          sub: "out of 100",
          subColor: avgSc.main + "80",
          trend: null,
        },
      ].map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 + i * 0.07 }}
          style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: `1px solid #F1F5F9`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8" }}>{s.label}</span>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: s.accent }}>{s.icon}</span>
            </div>
          </div>
          <div className="bricolage" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: s.accent, marginBottom: 6 }}>
            {s.value}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {s.trend === "up"   && <TrendingUp size={11} style={{ color: "#34D399" }} />}
            {s.trend === "down" && <TrendingDown size={11} style={{ color: "#FCA5A5" }} />}
            <span style={{ fontSize: 11, fontWeight: 500, color: s.subColor }}>{s.sub}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
