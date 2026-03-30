"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, ScanLine, Zap, Target, BarChart2 } from "lucide-react";
import { AgentInfo } from "../../../../types/orion";
import { formatDuration } from "./shared";

export interface PipelineStepperProps {
  agents: AgentInfo[];
}

const AGENT_ORDER = ["discovery", "performance", "scoring", "visualization"];

const AGENT_META: Record<string, {
  name: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}> = {
  discovery: { name: "Discovery", desc: "Crawls pages & maps site structure", icon: <ScanLine size={15} />, color: "#2563EB", bg: "#EEF3FF", border: "#BFDBFE" },
  performance: { name: "Performance", desc: "Audits load speed & resource budget", icon: <Zap size={15} />, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  scoring: { name: "Scoring", desc: "Weights findings into a 0–100 score", icon: <Target size={15} />, color: "#0891B2", bg: "#F0FBFF", border: "#BAE6FD" },
  visualization: { name: "Visualization", desc: "Generates charts and diff analysis", icon: <BarChart2 size={15} />, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
};

const STATUS_STYLE = {
  complete: { ring: "#BFDBFE", dot: "#2563EB", label: "Done", labelColor: "#2563EB", labelBg: "#EEF3FF" },
  running: { ring: "#DDD6FE", dot: "#7C3AED", label: "Running", labelColor: "#7C3AED", labelBg: "#F5F3FF" },
  queued: { ring: "#E2E8F0", dot: "#CBD5E1", label: "Queued", labelColor: "#94A3B8", labelBg: "#F8FAFC" },
  failed: { ring: "#FECACA", dot: "#EF4444", label: "Failed", labelColor: "#DC2626", labelBg: "#FEF2F2" },
};

export function PipelineStepper({ agents }: PipelineStepperProps) {
  const PIPELINE = AGENT_ORDER.map((typeKey) => {
    const found = agents.find(a => a.type === typeKey);
    const meta = AGENT_META[typeKey];
    return {
      key: typeKey,
      ...meta,
      status: (found?.status || "queued") as keyof typeof STATUS_STYLE,
      duration: found?.durationMs ? formatDuration(found.durationMs) : null,
      score: found?.score,
    };
  });

  // Progress: how many steps are complete
  const doneCount = PIPELINE.filter(p => p.status === "complete").length;
  const progressPct = (doneCount / PIPELINE.length) * 100;

  return (
    <motion.div
      className="card card-glow"
      style={{ padding: "24px 28px" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.45 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="bricolage font-bold text-base" style={{ color: "var(--text-primary)" }}>
            Agent Pipeline
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {doneCount} of {PIPELINE.length} agents complete
          </p>
        </div>
        {/* Compact progress pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}
        >
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--accent-mid)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--accent)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-xs font-bold mono" style={{ color: "var(--accent)" }}>
            {Math.round(progressPct)}%
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Connector track */}
        <div
          className="absolute hidden sm:block"
          style={{
            top: 20, left: "12.5%", right: "12.5%", height: 2,
            background: "var(--border)", borderRadius: 99, zIndex: 0,
          }}
        />
        {/* Filled connector */}
        <motion.div
          className="absolute hidden sm:block"
          style={{
            top: 20, left: "12.5%", height: 2,
            background: "linear-gradient(90deg, #2563EB, #7C3AED, #0891B2)",
            borderRadius: 99, zIndex: 1,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct * 0.75}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />

        <div className="relative flex">
          {PIPELINE.map((step, i) => {
            const ss = STATUS_STYLE[step.status];
            return (
              <motion.div
                key={step.key}
                className="relative flex flex-col items-center text-center w-1/4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.1, duration: 0.4 }}
              >
                {/* Icon circle */}
                <div
                  className="relative w-10 h-10 rounded-full flex items-center justify-center mb-3"
                  style={{
                    background: step.status === "queued" ? "#F8FAFC" : step.bg,
                    border: `2px solid ${ss.ring}`,
                    boxShadow: step.status !== "queued" ? `0 0 0 4px ${step.bg}` : "0 0 0 4px #fff",
                  }}
                >
                  {step.status === "running" && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ background: step.color }}
                    />
                  )}
                  {step.status === "complete" ? (
                    <CheckCircle2 size={16} style={{ color: step.color }} />
                  ) : step.status === "failed" ? (
                    <XCircle size={16} style={{ color: "#DC2626" }} />
                  ) : (
                    <span style={{ color: step.status === "running" ? step.color : "#CBD5E1" }}>
                      {step.icon}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-xs sm:text-sm font-bold"
                    style={{ color: step.status === "queued" ? "var(--text-muted)" : "var(--text-primary)" }}
                  >
                    {step.name}
                  </span>
                </div>

                {/* Description */}
                <p className="hidden sm:block text-xs leading-snug px-1 mb-2" style={{ color: "var(--text-muted)" }}>
                  {step.desc}
                </p>

                {/* Status + Duration */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: ss.labelBg, color: ss.labelColor, fontSize: 10 }}
                  >
                    {step.status === "running" ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: ss.dot }} />
                        Running
                      </span>
                    ) : ss.label}
                  </span>
                  {step.duration && (
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                      style={{ background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}
                    >
                      <Clock size={9} style={{ color: "var(--accent)" }} />
                      <span className="mono font-semibold" style={{ fontSize: 9, color: "var(--accent)" }}>
                        {step.duration}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}