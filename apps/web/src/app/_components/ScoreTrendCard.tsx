import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { CustomTooltip, fadeUp } from "./shared";

export interface ScoreTrendCardProps {
    isLoading: boolean;
    scoreTrend: { date: string; score: number }[];
    delay?: number;
}

export function ScoreTrendCard({ isLoading, scoreTrend, delay = 3 }: ScoreTrendCardProps) {
    return (
        <motion.div
            variants={fadeUp}
            custom={delay}
            className="bg-[var(--bg-card)] rounded-2xl p-4 flex flex-col justify-between"
            style={{ border: "1px solid var(--border-light)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                    Score Trend
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--warn-bg)" }}>
                    <TrendingUp size={15} style={{ color: "var(--warn)" }} />
                </div>
            </div>
            <div className="flex-1 min-h-[50px] mt-1 relative">
                {isLoading ? (
                    <div className="absolute inset-0 shimmer rounded-lg" />
                ) : scoreTrend.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scoreTrend}>
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#FDE68A", strokeWidth: 1 }} />
                            <Line type="monotone" dataKey="score" name="Score" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3, fill: "#F59E0B", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="bricolage text-[2rem] font-extrabold leading-none" style={{ color: "var(--text-main)" }}>
                        {scoreTrend.length === 1 ? scoreTrend[0]?.score : "—"}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
