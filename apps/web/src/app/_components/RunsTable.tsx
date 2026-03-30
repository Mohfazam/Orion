import { motion } from "framer-motion";
import { Clock, Activity, AlertTriangle, Globe, ChevronRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Run } from "../../types/orion";
import { FILTERS, FilterType, StatusBadge, PassFailBadge, ScoreRing, formatDuration, Status } from "./shared";

// ─── Sub-component: EmptyState
function EmptyState({ filter }: { filter: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: "var(--primary-bg-alt)", border: "1.5px solid var(--primary-border)" }}
            >
                <Activity size={28} style={{ color: "var(--primary-border-light)" }} />
            </div>
            <p className="font-semibold text-slate-700 text-base">
                No {filter !== "All" ? filter.toLowerCase() : ""} runs yet
            </p>
            <p className="text-slate-400 text-sm mt-1.5 max-w-xs leading-relaxed">
                Paste any public URL in the search bar above to kick off your first audit.
            </p>
            <button
                className="mt-6 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                style={{ background: "var(--primary-bg)", color: "var(--primary-hover)", border: "1px solid var(--primary-border)" }}
            >
                <Play size={13} className="fill-current" /> Start your first audit
            </button>
        </div>
    );
}

export interface RunsTableProps {
    runs: Run[];
    isLoading: boolean;
    error: string | null;
    filter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    page: number;
    hasNext: boolean;
    hasPrev: boolean;
    onPrevPage: () => void;
    onNextPage: () => void;
    totalCount: number;
}

export function RunsTable({
    runs,
    isLoading,
    error,
    filter,
    onFilterChange,
    page,
    hasNext,
    hasPrev,
    onPrevPage,
    onNextPage,
    totalCount
}: RunsTableProps) {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="bg-[var(--bg-card)] rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border-subtle)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
            {/* Header */}
            <div
                className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ borderBottom: "1px solid var(--border-light)" }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "var(--primary-bg)" }}
                    >
                        <Clock size={16} style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                        <h2 className="bricolage font-bold text-lg" style={{ color: "var(--text-main)" }}>
                            Run History
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                            {totalCount} audits · sorted by recency
                        </p>
                    </div>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            onClick={() => onFilterChange(f as FilterType)}
                            className="text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all"
                            style={
                                filter === f
                                    ? { background: "var(--primary)", color: "var(--text-inverse)", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }
                                    : { background: "var(--bg-muted)", color: "var(--text-muted)", border: "1px solid var(--border-muted)" }
                            }
                        >
                            {f}
                            {f !== "All" && (
                                <span
                                    className="ml-1.5 rounded-full px-1 py-0"
                                    style={{
                                        background: filter === f ? "rgba(255,255,255,0.2)" : "var(--border-muted)",
                                        color: filter === f ? "#fff" : "var(--text-dim)",
                                        fontSize: 10,
                                    }}
                                >
                                    {f === "Complete" ? 3 : f === "Running" ? 1 : f === "Queued" ? 1 : 1}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table / Empty State */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <Activity size={28} className="animate-spin text-blue-500 mb-5" />
                    <p className="font-semibold text-slate-700 text-base">Loading history...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <AlertTriangle size={28} className="text-red-500 mb-5" />
                    <p className="font-semibold text-slate-700 text-base">Failed to fetch runs</p>
                    <p className="text-slate-400 text-sm mt-1.5 max-w-xs">{error}</p>
                </div>
            ) : runs.length === 0 ? (
                <EmptyState filter={filter} />
            ) : (
                <div className="overflow-x-auto">
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "var(--bg-subtle)" }}>
                                {["Website", "Status", "Score", "Result", "Findings", "Run At", ""].map((h, idx) => (
                                    <th
                                        key={h || `header-col-${idx}`}
                                        className="text-left"
                                        style={{
                                            padding: "10px 16px",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: "var(--text-dim)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.07em",
                                            borderBottom: "1px solid var(--border-light)",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((r, i) => {
                                const run = r as Run & { mode?: string, failedRules?: number, passedRules?: number, completedAt?: string };
                                return (
                                <motion.tr
                                    key={run.id || run.runId || `run-row-${i}`}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
                                    className="row-hover"
                                    style={{
                                        borderBottom: i < runs.length - 1 ? "1px solid #F8FAFF" : "none",
                                        cursor: "pointer",
                                        transition: "background 0.15s ease",
                                    }}
                                    onClick={() => router.push(`/runs/${run.runId}`)}
                                >
                                    {/* Website */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: "var(--primary-bg-alt)", border: "1px solid var(--primary-border)" }}
                                            >
                                                <Globe size={15} style={{ color: "var(--primary-light)" }} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm truncate" style={{ color: "var(--text-main)", maxWidth: 180, fontFamily: "monospace" }}>
                                                    {run.url}
                                                </span>
                                                <span className="text-xs font-semibold mt-0.5" style={{ color: "var(--text-dim)" }}>
                                                    {run.mode === "api" ? "API Trigger" : "Manual Run"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Status */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <StatusBadge status={run.status as Status} />
                                    </td>
                                    {/* Score */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <ScoreRing score={run.overallScore} />
                                    </td>
                                    {/* Result */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <PassFailBadge passed={run.passed} />
                                    </td>
                                    {/* Findings summary */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col text-xs font-semibold">
                                                <span style={{ color: run.failedRules ? "var(--danger)" : "var(--text-dim)" }}>
                                                    {run.failedRules ? `${run.failedRules} issues` : (run.status === "failed" ? "—" : "0 issues")}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Run At */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                                            {new Date(run.createdAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            {(() => {
                                                const computedMs = run.durationMs || (run.completedAt && run.createdAt ? (new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime()) : 0);
                                                if (!computedMs) return null;
                                                const s = Math.floor(computedMs / 1000);
                                                const durStr = s < 1 ? "< 1s" : `${Math.floor(s / 60)}m ${s % 60}s`;
                                                return (
                                                    <span className="px-1.5 py-0.5 rounded-md" style={{ background: "var(--border-light)", color: "var(--text-muted)" }}>
                                                        {durStr}
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                    </td>
                                    {/* Chevron */}
                                    <td style={{ padding: "16px 16px", textAlign: "right" }}>
                                        <ChevronRight size={16} style={{ color: "var(--text-faint)" }} />
                                    </td>
                                </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Pagination */}
            {!isLoading && runs.length > 0 && (
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                        Showing page {page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onPrevPage}
                            disabled={!hasPrev}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-muted)", color: "#475569" }}
                        >
                            Previous
                        </button>
                        <button
                            onClick={onNextPage}
                            disabled={!hasNext}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-muted)", color: "#475569" }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
