import { motion } from "framer-motion";
import { fadeUp } from "./shared";

export interface StatCardProps {
    label: string;
    value: string | number;
    sub: string;
    subColor?: string;
    icon: React.ReactNode;
    accent: string;
    delay: number;
}

export function StatCard({ label, value, sub, subColor = "var(--text-dim)", icon, accent, delay }: StatCardProps) {
    return (
        <motion.div
            variants={fadeUp}
            custom={delay}
            className="bg-[var(--bg-card)] rounded-2xl p-5 flex flex-col gap-3"
            style={{ border: "1px solid var(--border-light)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                    {label}
                </span>
                <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: accent + "18" }}
                >
                    <span style={{ color: accent }}>{icon}</span>
                </div>
            </div>
            <div>
                <div className="bricolage text-[2rem] font-extrabold leading-none" style={{ color: accent === "var(--primary)" ? "var(--text-main)" : accent }}>
                    {value}
                </div>
                <div className="text-xs mt-1.5 font-medium" style={{ color: subColor }}>
                    {sub}
                </div>
            </div>
        </motion.div>
    );
}
