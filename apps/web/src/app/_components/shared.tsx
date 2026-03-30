import { CheckCircle2, XCircle } from "lucide-react";
import { TooltipProps } from "recharts";

export type Status = "complete" | "running" | "queued" | "failed";

export const FILTERS = ["All", "Complete", "Running", "Queued", "Failed"] as const;
export type FilterType = (typeof FILTERS)[number];

export const STATUS_MAP: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
    complete: { label: "Complete", bg: "var(--primary-bg)", text: "var(--primary-hover)", dot: "var(--primary-light)" },
    running: { label: "Running", bg: "#F5F3FF", text: "#7C3AED", dot: "#8B5CF6" },
    queued: { label: "Queued", bg: "var(--bg-muted)", text: "var(--text-muted)", dot: "var(--text-dim)" },
    failed: { label: "Failed", bg: "var(--danger-bg)", text: "var(--danger-dark)", dot: "var(--danger)" },
};

export const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

export const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

export function formatDuration(ms?: number | null): string | null {
    if (!ms) return null;
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function getScoreStyle(score: number | null | undefined): { bg: string; text: string; border: string } {
    if (score === null || score === undefined) return { bg: "var(--bg-muted)", text: "var(--text-dim)", border: "var(--border-muted)" };
    if (score >= 80) return { bg: "var(--success-bg)", text: "var(--success-dark)", border: "#A7F3D0" };
    if (score >= 60) return { bg: "var(--warn-bg)", text: "var(--warn)", border: "#FDE68A" };
    return { bg: "var(--danger-bg)", text: "var(--danger-dark)", border: "#FECACA" };
}

// @ts-ignore
export function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-muted)", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "var(--text-base)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            {payload[0].name}: <strong>{payload[0].value}</strong>
        </div>
    );
}

export function ScoreRing({ score }: { score: number | null | undefined }) {
    const s = getScoreStyle(score ?? null);
    return (
        <div
            className="score-ring"
            style={{ background: s.bg, color: s.text, border: `1.5px solid ${s.border}` }}
        >
            {score ?? "—"}
        </div>
    );
}

export function StatusBadge({ status }: { status: any }) {
    const s = STATUS_MAP[status as Status];
    if (!s) return null;
    return (
        <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: s.bg, color: s.text }}
        >
            {status === "running" ? (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.dot }} />
            ) : (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
            )}
            {s.label}
        </span>
    );
}

export function PassFailBadge({ passed }: { passed: boolean | null | undefined }) {
    if (passed === null || passed === undefined) return <span style={{ color: "var(--text-faint)", fontSize: 14, fontWeight: 600 }}>—</span>;
    return passed ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--success-bg)", color: "var(--success-dark)" }}>
            <CheckCircle2 size={11} /> Pass
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--danger-bg)", color: "var(--danger-dark)" }}>
            <XCircle size={11} /> Fail
        </span>
    );
}
