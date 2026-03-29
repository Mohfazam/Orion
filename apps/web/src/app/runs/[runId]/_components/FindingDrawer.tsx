"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Cpu, Lightbulb, Flame, ShieldAlert, AlertTriangle, Info } from "lucide-react";
import { Finding, Severity } from "../../../../types/orion";

export const SEV: Record<Severity, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  critical: { label: "Critical", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: <Flame size={11} /> },
  high:     { label: "High",     color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA", icon: <ShieldAlert size={11} /> },
  medium:   { label: "Medium",   color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: <AlertTriangle size={11} /> },
  low:      { label: "Low",      color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", icon: <Info size={11} /> },
  info:     { label: "Info",     color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", icon: <Info size={11} /> },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = SEV[severity];
  if (!s) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {s.icon} {s.label}
    </span>
  );
}

export interface FindingDrawerProps {
  finding: Finding | null;
  onClose: () => void;
}

export function FindingDrawer({ finding, onClose }: FindingDrawerProps) {
  if (!finding) return null;
  const s = SEV[finding.severity] || SEV.info;

  return (
    <AnimatePresence>
      {finding && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed top-0 right-0 h-full z-300 flex flex-col overflow-y-auto"
            style={{
              width: "min(520px, 92vw)",
              background: "#fff",
              boxShadow: "-8px 0 40px rgba(15,23,42,0.14)",
              zIndex: 300,
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            <div
              className="px-6 py-5 flex items-start justify-between gap-4 sticky top-0 bg-white"
              style={{ borderBottom: "1px solid #F1F5F9", zIndex: 1 }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={finding.severity} />
                  {finding.confidence !== undefined && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md block shrink-0 z-10"
                      style={{ background: "#F0F5FF", color: "#1D4ED8", border: "1px solid #DBEAFE" }}
                    >
                      {finding.confidence}% confidence
                    </span>
                  )}
                </div>
                <h2 className="bricolage font-bold text-xl leading-snug" style={{ color: "#0F172A" }}>
                  {finding.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                <X size={15} style={{ color: "#64748B" }} />
              </button>
            </div>

            <div className="flex flex-col gap-6 px-6 py-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Agent", value: finding.agentType, icon: <Cpu size={12} /> },
                  { label: "Location", value: finding.file, icon: <Globe size={12} /> },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                  >
                    <span style={{ color: "#2563EB" }}>{m.icon}</span>
                    <span className="text-xs text-slate-400 font-medium">{m.label}:</span>
                    <span className="text-xs font-semibold" style={{ color: "#0F172A" }}>{String(m.value)}</span>
                  </div>
                ))}
              </div>

              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "#94A3B8" }}
                >
                  Detail
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#475569", lineHeight: 1.75 }}>
                  {finding.detail}
                </p>
              </div>

              <div style={{ height: 1, background: "#F1F5F9" }} />

              {(finding.fixSuggestion || finding.fixSuggestion === "") && (
                <div
                  className="rounded-2xl p-5"
                  style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "#0EA5E9", boxShadow: "0 2px 8px rgba(14,165,233,0.3)" }}
                    >
                      <Lightbulb size={13} style={{ color: "#fff" }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#0C4A6E" }}>
                      Suggested Fix
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#0369A1", lineHeight: 1.75 }}>
                    {finding.fixSuggestion}
                  </p>
                </div>
              )}

              {finding.confidence !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                      Agent Confidence
                    </span>
                    <span className="text-xs font-bold" style={{ color: s.color }}>
                      {finding.confidence}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: s.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${finding.confidence}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
