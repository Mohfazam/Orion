"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { TooltipProps } from "recharts";
import { AgentInfo, RunStatus, Severity } from "../../../../types/orion";

export const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
    *, *::before, *::after { font-family: 'DM Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    .bricolage { font-family: 'Bricolage Grotesque', sans-serif; }

    :root {
      --accent: #2563EB;
      --accent-mid: #BFDBFE;
      --accent-light: #EFF6FF;
      --border: #E2E8F0;
      --text-primary: #0F172A;
      --text-secondary: #475569;
      --text-muted: #94A3B8;
    }

    .dot-bg {
      background-image: radial-gradient(circle, #c7d7f0 1px, transparent 1px);
      background-size: 24px 24px;
    }

    @keyframes arcDraw {
      from { stroke-dashoffset: 339.292; }
    }
    .score-arc { animation: arcDraw 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

    @keyframes pulseRing {
      0%   { transform: scale(1);   opacity: 0.8; }
      100% { transform: scale(1.9); opacity: 0;   }
    }
    .pulse-ring {
      position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: 50%;
      animation: pulseRing 1.4s ease-out infinite;
    }

    .row-hover:hover { background-color: var(--primary-bg-alt); cursor: pointer; }

    .drawer-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(3px);
      z-index: 200;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #F8FAFF; }
    ::-webkit-scrollbar-thumb { background: var(--primary-border); border-radius: 999px; }
  `}</style>
);

export function scoreColor(s: number) {
  if (s >= 80) return { main: "var(--success-dark)", light: "var(--success-bg)", arc: "var(--success)", text: "#065F46" };
  if (s >= 60) return { main: "var(--warn)", light: "var(--warn-bg)", arc: "#F59E0B", text: "#92400E" };
  return       { main: "var(--danger-dark)", light: "var(--danger-bg)", arc: "var(--danger)", text: "#7F1D1D" };
}

export function StatusBadge({ status }: { status: RunStatus }) {
  const MAP = {
    complete: { bg: "var(--primary-bg)", text: "var(--primary-hover)", dot: "var(--primary-light)", label: "Complete" },
    running:  { bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6", label: "Running"  },
    queued:   { bg: "var(--bg-muted)", text: "var(--text-muted)", dot: "var(--text-dim)", label: "Queued"   },
    failed:   { bg: "var(--danger-bg)", text: "var(--danger-dark)", dot: "var(--danger)", label: "Failed"   },
  };
  const s = MAP[status] || MAP.queued;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "4px 12px", 
        borderRadius: 9999, flexShrink: 0,
        background: s.bg, color: s.text, border: `1px solid ${s.text}22`
      }}
    >
      <span style={{ position: "relative", display: "flex", height: 8, width: 8 }}>
        {status === "running" && (
          <span className="pulse-ring" style={{ background: s.dot }} />
        )}
        <span style={{ position: "relative", display: "flex", height: 8, width: 8, borderRadius: "50%", background: s.dot }} />
      </span>
      {s.label}
    </span>
  );
}

export function ScoreArc({ score }: { score: number }) {
  const sc = scoreColor(score);
  const r = 54;
  const circ = 2 * Math.PI * r; 
  const dashOffset = circ - (circ * score) / 100;

  return (
    <div style={{ position: "relative", flexShrink: 0, width: 148, height: 148 }}>
      <div
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderRadius: "50%",
          background: sc.light,
          boxShadow: `0 0 0 6px ${sc.arc}18`,
        }}
      />
      <svg width={148} height={148} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={74} cy={74} r={r} fill="none" stroke="var(--border-muted)" strokeWidth={10} />
        <motion.circle
          cx={74} cy={74} r={r}
          fill="none"
          stroke={sc.arc}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </svg>
      <div
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, left: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: sc.main
        }}
      >
        <motion.span
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, lineHeight: 1, fontSize: 38 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "backOut" }}
        >
          {score}
        </motion.span>
        <span style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: sc.main + "99" }}>
          /100
        </span>
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-muted)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-base)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      {payload[0].name ?? payload[0].payload?.name}: <strong>{payload[0].value}</strong>
    </div>
  );
}

export function formatDuration(ms?: number | null): string {
  if (!ms) return "0s";
  const s = Math.floor(ms / 1000);
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}
