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
      position: absolute; inset: 0; border-radius: 50%;
      animation: pulseRing 1.4s ease-out infinite;
    }

    .row-hover:hover { background-color: #f0f5ff; cursor: pointer; }

    .drawer-backdrop {
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(3px);
      z-index: 200;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #F8FAFF; }
    ::-webkit-scrollbar-thumb { background: #DBEAFE; border-radius: 999px; }
  `}</style>
);

export function scoreColor(s: number) {
  if (s >= 80) return { main: "#059669", light: "#ECFDF5", arc: "#10B981", text: "#065F46" };
  if (s >= 60) return { main: "#D97706", light: "#FFFBEB", arc: "#F59E0B", text: "#92400E" };
  return       { main: "#DC2626", light: "#FEF2F2", arc: "#EF4444", text: "#7F1D1D" };
}

export function StatusBadge({ status }: { status: RunStatus }) {
  const MAP = {
    complete: { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6", label: "Complete" },
    running:  { bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6", label: "Running"  },
    queued:   { bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8", label: "Queued"   },
    failed:   { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444", label: "Failed"   },
  };
  const s = MAP[status] || MAP.queued;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}22` }}
    >
      <span className="relative flex h-2 w-2">
        {status === "running" && (
          <span className="pulse-ring" style={{ background: s.dot }} />
        )}
        <span className="relative flex h-2 w-2 rounded-full" style={{ background: s.dot }} />
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
    <div className="relative flex-shrink-0" style={{ width: 148, height: 148 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: sc.light,
          boxShadow: `0 0 0 6px ${sc.arc}18`,
        }}
      />
      <svg width={148} height={148} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={74} cy={74} r={r} fill="none" stroke="#E2E8F0" strokeWidth={10} />
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
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ color: sc.main }}
      >
        <motion.span
          className="bricolage font-extrabold leading-none"
          style={{ fontSize: 38 }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "backOut" }}
        >
          {score}
        </motion.span>
        <span className="text-xs font-semibold mt-0.5" style={{ color: sc.main + "99" }}>
          /100
        </span>
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#334155", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
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
