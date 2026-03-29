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
                style={{ background: "#F0F5FF", border: "1.5px solid #DBEAFE" }}
            >
                <Activity size={28} style={{ color: "#BFDBFE" }} />
            </div>
            <p className="font-semibold text-slate-700 text-base">
                No {filter !== "All" ? filter.toLowerCase() : ""} runs yet
            </p>
            <p className="text-slate-400 text-sm mt-1.5 max-w-xs leading-relaxed">
                Paste any public URL in the search bar above to kick off your first audit.
            </p>
            <button
                className="mt-6 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
                style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #DBEAFE" }}
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
            className="bg-white rounded-2xl overflow-hidden"
            style={{ border: "1px solid #EFF3FB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
            {/* Header */}
            <div
                className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ borderBottom: "1px solid #F1F5F9" }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "#EFF6FF" }}
                    >
                        <Clock size={16} style={{ color: "#2563EB" }} />
                    </div>
                    <div>
                        <h2 className="bricolage font-bold text-lg" style={{ color: "#0F172A" }}>
                            Run History
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
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
                                    ? { background: "#2563EB", color: "#fff", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }
                                    : { background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }
                            }
                        >
                            {f}
                            {f !== "All" && (
                                <span
                                    className="ml-1.5 rounded-full px-1 py-0"
                                    style={{
                                        background: filter === f ? "rgba(255,255,255,0.2)" : "#E2E8F0",
                                        color: filter === f ? "#fff" : "#94A3B8",
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
                            <tr style={{ background: "#FAFBFF" }}>
                                {["Website", "Status", "Score", "Result", "Findings", "Run At", ""].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left"
                                        style={{
                                            padding: "10px 16px",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: "#94A3B8",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.07em",
                                            borderBottom: "1px solid #F1F5F9",
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((r, i) => {
                                const run = r as Run & { mode?: string, failedRules?: number, passedRules?: number };
                                return (
                                <motion.tr
                                    key={run.id}
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
                                                style={{ background: "#F0F5FF", border: "1px solid #DBEAFE" }}
                                            >
                                                <Globe size={15} style={{ color: "#3B82F6" }} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm truncate" style={{ color: "#0F172A", maxWidth: 180, fontFamily: "monospace" }}>
                                                    {run.url}
                                                </span>
                                                <span className="text-xs font-semibold mt-0.5" style={{ color: "#94A3B8" }}>
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
                                                <span style={{ color: "#EF4444" }}>{run.failedRules || 0} issues</span>
                                                <span style={{ color: "#94A3B8" }}>{run.passedRules || 0} passed</span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Run At */}
                                    <td style={{ padding: "16px 16px" }}>
                                        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "#64748B" }}>
                                            {new Date(run.createdAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            {formatDuration(run.durationMs) && (
                                                <span className="px-1.5 py-0.5 rounded-md" style={{ background: "#F1F5F9", color: "#64748B" }}>
                                                    {formatDuration(run.durationMs)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {/* Chevron */}
                                    <td style={{ padding: "16px 16px", textAlign: "right" }}>
                                        <ChevronRight size={16} style={{ color: "#CBD5E1" }} />
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
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFF" }}>
                    <span className="text-xs font-semibold" style={{ color: "#94A3B8" }}>
                        Showing page {page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onPrevPage}
                            disabled={!hasPrev}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "#fff", border: "1px solid #E2E8F0", color: "#475569" }}
                        >
                            Previous
                        </button>
                        <button
                            onClick={onNextPage}
                            disabled={!hasNext}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "#fff", border: "1px solid #E2E8F0", color: "#475569" }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
