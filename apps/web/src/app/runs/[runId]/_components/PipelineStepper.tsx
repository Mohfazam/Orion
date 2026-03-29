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
  // Always map into the fixed 4 slots using defined fallbacks based on original design
  const PIPELINE = AGENT_ORDER.map((typeKey, idx) => {
    const found = agents.find(a => a.type === typeKey);
    const defaults = {
      discovery: { name: "Discovery", desc: "Crawls pages & maps site structure", icon: <ScanLine size={16} /> },
      performance: { name: "Performance", desc: "Audits load speed & resource budget", icon: <Zap size={16} /> },
      scoring: { name: "Scoring", desc: "Weights findings into a 0–100 score", icon: <Target size={16} /> },
      visualization: { name: "Visualization", desc: "Generates charts and diff analysis", icon: <BarChart2 size={16} /> }
    } as any;
    
    const d = defaults[typeKey];
    
    return {
      key: typeKey,
      name: found?.name || d.name,
      desc: d.desc,
      icon: d.icon,
      status: found?.status || "queued",
      duration: found?.durationMs ? formatDuration(found.durationMs) : null
    };
  });

  return (
    <motion.div
      className="bg-white rounded-2xl p-6"
      style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "#EFF6FF" }}
        >
          <Cpu size={16} style={{ color: "#2563EB" }} />
        </div>
        <div>
          <h2 className="bricolage font-bold text-base" style={{ color: "#0F172A" }}>
            Agent Pipeline
          </h2>
          <p className="text-xs" style={{ color: "#94A3B8" }}>
            4 agents · tracking execution sequence
          </p>
        </div>
      </div>

      <div className="flex gap-0 overflow-x-auto pb-2">
        {PIPELINE.map((step, index) => {
          const isLast = index === PIPELINE.length - 1;
          const statusConfig = {
            complete: { ring: "#DBEAFE", bg: "#EFF6FF",  icon: <CheckCircle2 size={14} style={{ color: "#2563EB" }} />, lineColor: "#BFDBFE" },
            running:  { ring: "#DDD6FE", bg: "#F5F3FF",  icon: <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#8B5CF6" }} />, lineColor: "#E2E8F0" },
            queued:   { ring: "#E2E8F0", bg: "#F8FAFC",  icon: <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#CBD5E1" }} />, lineColor: "#E2E8F0" },
            failed:   { ring: "#FECACA", bg: "#FEF2F2",  icon: <XCircle size={14} style={{ color: "#DC2626" }} />, lineColor: "#E2E8F0" },
          };
          const s = statusConfig[step.status];

          return (
            <motion.div
              key={step.key}
              className="flex-1 flex flex-col min-w-[150px]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
            >
              <div className="flex items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                  style={{
                    background: s.bg,
                    border: `2px solid ${s.ring}`,
                    boxShadow: step.status === "complete" ? "0 0 0 4px #EFF6FF" : undefined,
                  }}
                >
                  {s.icon}
                </div>
                {!isLast && (
                  <div
                    className="flex-1 h-0.5 mx-1"
                    style={{ background: step.status === "complete" ? "#BFDBFE" : "#E2E8F0" }}
                  />
                )}
              </div>

              <div className="mt-3 pr-4">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span style={{ color: "#64748B", flexShrink: 0 }}>{step.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>{step.name}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{step.desc}</p>
                {step.duration && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock size={10} style={{ color: "#2563EB" }} />
                    <span className="text-xs font-medium" style={{ color: "#2563EB" }}>{step.duration}</span>
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
