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

  return (
    <section
      className="relative overflow-hidden bg-white"
      style={{ borderBottom: "1px solid #EFF3FB" }}
    >
      <div className="dot-bg absolute inset-0 opacity-40 pointer-events-none" />
      <div
        className="absolute pointer-events-none"
        style={{
          top: -100, right: -100,
          width: 500, height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${sc.arc}22 0%, transparent 65%)`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col lg:flex-row lg:items-center gap-10">
          
          <motion.div
            className="flex items-center gap-8"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <ScoreArc score={run.overallScore ?? 0} />

            <div>
              <motion.div
                className="bricolage font-extrabold leading-tight mb-1"
                style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: sc.main }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                {getScoreLabel(run.overallScore ?? 0)}
              </motion.div>
              <p className="text-sm font-medium mb-4" style={{ color: "#94A3B8" }}>
                Overall site health score
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {run.passed !== undefined && (
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-bold px-3.5 py-1.5 rounded-full"
                    style={{
                      background: run.passed ? "#ECFDF5" : "#FEF2F2",
                      color: run.passed ? "#059669" : "#DC2626",
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
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full transition-all"
                    style={{
                      background: "#FEF2F2",
                      color: "#DC2626",
                      border: "1.5px solid #FECACA",
                    }}
                  >
                    <X size={12} /> Cancel Run
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <div
            className="hidden lg:block self-stretch"
            style={{ width: 1, background: "#EFF3FB" }}
          />

          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div
              className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
              style={{ background: "#F8FAFF", border: "1.5px solid #DBEAFE" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
              >
                <Globe size={18} style={{ color: "#2563EB" }} />
              </div>
              <div className="overflow-hidden">
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "#94A3B8" }}
                >
                  Audited URL
                </div>
                <div
                  className="font-bold text-base truncate"
                  style={{ color: "#0F172A", fontFamily: "monospace" }}
                >
                  {run.url}
                </div>
              </div>
              <a
                href={run.url.startsWith("http") ? run.url : `https://${run.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#EFF6FF", border: "1px solid #DBEAFE" }}
              >
                <ArrowUpRight size={14} style={{ color: "#2563EB" }} />
              </a>
            </div>

            <div className="flex flex-wrap items-stretch gap-3">
              {[
                { icon: <BarChart2 size={14} />, label: "Findings", value: String(Array.isArray(run.findings) ? run.findings.length : (run.findings || 0)), accent: sc.main },
                { icon: <Clock size={14} />,     label: "Duration", value: formatDuration(run.durationMs), accent: "#2563EB" },
                { icon: <Calendar size={14} />,  label: "Started",  value: new Date(run.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }), accent: "#7C3AED" },
                { icon: <Eye size={14} />,       label: "Run ID",   value: run.runId, accent: "#0891B2" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl p-3 flex flex-col gap-1 flex-1 min-w-[130px]"
                  style={{ background: "#fff", border: "1px solid #F1F5F9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span style={{ color: m.accent, flexShrink: 0 }}>{m.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "#94A3B8" }}>
                      {m.label}
                    </span>
                  </div>
                  <div
                    className="font-bold text-sm truncate"
                    style={{ color: "#0F172A", fontFamily: m.label === "Run ID" ? "monospace" : undefined }}
                    title={m.value}
                    suppressHydrationWarning
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
