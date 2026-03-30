import { motion } from "framer-motion";
import { Target } from "lucide-react";

export interface TopUrlsStripProps {
    isLoading: boolean;
    topUrls: { url: string; count: number }[];
    onSelectUrl: (url: string) => void;
}

export function TopUrlsStrip({ isLoading, topUrls, onSelectUrl }: TopUrlsStripProps) {
    if (isLoading || topUrls.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2"
        >
            <span className="text-xs font-bold uppercase tracking-widest flex-shrink-0 flex items-center gap-1" style={{ color: "var(--text-dim)" }}>
                <Target size={12} /> Top Audited:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scroll">
                {topUrls.map(urlData => (
                    <button
                        key={urlData.url}
                        onClick={() => onSelectUrl(urlData.url)}
                        title={urlData.url}
                        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
                        style={{ background: "var(--bg-card)", color: "#475569", border: "1px solid var(--border-muted)", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--text-faint)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-muted)"}
                    >
                        <span className="truncate max-w-[140px] font-mono">{urlData.url.replace(/^https?:\/\//, '')}</span>
                        <span className="font-bold flex items-center justify-center min-w-[18px]" style={{ color: "var(--text-muted)" }}>
                            {urlData.count}
                        </span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
