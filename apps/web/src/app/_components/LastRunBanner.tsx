import { motion } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Run } from "../../types/orion";
import { StatusBadge, PassFailBadge, getScoreStyle, Status } from "./shared";

export interface LastRunBannerProps {
    isLoading: boolean;
    lastRun: Run | null;
}

export function LastRunBanner({ isLoading, lastRun }: LastRunBannerProps) {
    const router = useRouter();

    if (isLoading) {
        return <div className="h-[72px] bg-[var(--bg-card)] rounded-2xl shimmer" style={{ border: "1px solid var(--border-subtle)" }} />;
    }

    if (!lastRun) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-card)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ border: "1px solid var(--border-subtle)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0" style={{ background: "var(--primary-bg-alt)", border: "1px solid var(--primary-border)" }}>
                    <Clock size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-dim)" }}>
                        Resume where you left off
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-sm truncate" style={{ color: "var(--text-main)", maxWidth: 280, fontFamily: "monospace" }}>
                            {lastRun.url}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                            {lastRun.overallScore !== null && lastRun.overallScore !== undefined && (
                                <span
                                    className="inline-flex items-center gap-1.5 text-xs font-extrabold px-2 py-0.5 rounded-full"
                                    style={{ background: getScoreStyle(lastRun.overallScore).bg, color: getScoreStyle(lastRun.overallScore).text, border: `1px solid ${getScoreStyle(lastRun.overallScore).border}` }}
                                >
                                    {lastRun.overallScore}
                                </span>
                            )}
                            <StatusBadge status={lastRun.status as Status} />
                            <PassFailBadge passed={lastRun.passed} />
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={() => router.push(`/runs/${lastRun.runId}`)}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all flex-shrink-0"
                style={{ background: "var(--primary-bg)", color: "var(--primary-hover)", border: "1px solid var(--primary-border)" }}
            >
                View Report <ArrowRight size={14} />
            </button>
        </motion.div>
    );
}
