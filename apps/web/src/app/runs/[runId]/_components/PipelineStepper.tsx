"use client";

import { motion } from "framer-motion";
import { Cpu, CheckCircle2, XCircle, Clock, ScanLine, Zap, Target, BarChart2 } from "lucide-react";
import { AgentInfo } from "../../../../types/orion";
import { formatDuration } from "./shared";

export interface PipelineStepperProps {
  agents: AgentInfo[];
}

const AGENT_ORDER = ["discovery", "performance", "scoring", "visualization"];

export function PipelineStepper({ agents }: PipelineStepperProps) {
  const PIPELINE = AGENT_ORDER.map((typeKey) => {
    const found = agents.find((a) => (a.agent || a.type) === typeKey);
    const defaults = {
      discovery: { name: "Discovery", desc: "Crawls pages & maps site structure", icon: <ScanLine size={16} /> },
      performance: { name: "Performance", desc: "Audits load speed & resource budget", icon: <Zap size={16} /> },
      scoring: { name: "Scoring", desc: "Weights findings into a 0–100 score", icon: <Target size={16} /> },
      visualization: { name: "Visualization", desc: "Generates charts and diff analysis", icon: <BarChart2 size={16} /> },
    } as any;

    const d = defaults[typeKey];

    return {
      key: typeKey,
      name: found?.name || d.name,
      desc: d.desc,
      icon: d.icon,
      status: found?.status || "queued",
      duration: found?.durationMs ? formatDuration(found.durationMs) : null,
    };
  });

  return (
    <motion.div
      style={{
        background: "var(--bg-card)",
        borderRadius: 16,
        padding: 24,
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--primary-bg)",
          }}
        >
          <Cpu size={16} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--text-main)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Agent Pipeline
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
            4 agents · tracking execution sequence
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 8, width: "100%" }}>
        {PIPELINE.map((step, index) => {
          const isLast = index === PIPELINE.length - 1;
          const statusConfig = {
            complete: { ring: "var(--primary-border)", bg: "var(--primary-bg)", icon: <CheckCircle2 size={14} style={{ color: "var(--primary)" }} />, lineColor: "var(--primary-border-light)" },
            running: { ring: "#DDD6FE", bg: "#F5F3FF", icon: <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#8B5CF6" }} className="pulse-ring" />, lineColor: "var(--border-muted)" },
            queued: { ring: "var(--border-muted)", bg: "var(--bg-muted)", icon: <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--text-faint)" }} />, lineColor: "var(--border-muted)" },
            failed: { ring: "#FECACA", bg: "var(--danger-bg)", icon: <XCircle size={14} style={{ color: "var(--danger-dark)" }} />, lineColor: "var(--border-muted)" },
          };
          const s = statusConfig[step.status as keyof typeof statusConfig] || statusConfig.queued;

          return (
            <motion.div
              key={step.key}
              style={{ flex: "1 1 0%", display: "flex", flexDirection: "column", minWidth: 150 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 10,
                    background: s.bg,
                    border: `2px solid ${s.ring}`,
                    boxShadow: step.status === "complete" ? "0 0 0 4px var(--primary-bg)" : undefined,
                  }}
                >
                  {s.icon}
                </div>
                {!isLast && (
                  <div
                    style={{
                      flex: 1, height: 2, margin: "0 4px",
                      background: step.status === "complete" ? "var(--primary-border-light)" : "var(--border-muted)",
                    }}
                  />
                )}
              </div>

              <div style={{ marginTop: 12, paddingRight: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex" }}>{step.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{step.name}</span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.6, margin: 0, color: "var(--text-dim)" }}>{step.desc}</p>
                {step.duration && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Clock size={10} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--primary)" }}>{step.duration}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
