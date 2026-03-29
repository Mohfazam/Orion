"use client";

import { motion } from "framer-motion";
import {
    Globe,
    Play,
    CheckCircle2,
    XCircle,
    Activity,
    ChevronRight,
    Clock,
    TrendingUp,
    Target,
    Zap,
    AlertTriangle,
    BarChart3,
} from "lucide-react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    TooltipProps,
} from "recharts";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { runsService } from "../services/runs.service";
import { useActiveRuns } from "../hooks/useActiveRuns";
import { getScoreColor, getScoreLabel } from "../constants/orion";
import { Run } from "../types/orion";


// ─── Fonts ────────────────────────────────────────────────────────────────────

const FontStyle = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&display=swap');

    *, *::before, *::after { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    .bricolage { font-family: 'Bricolage Grotesque', sans-serif; }

    .dot-bg {
      background-image: radial-gradient(circle, #bfcfe8 1px, transparent 1px);
      background-size: 26px 26px;
    }

    .score-ring {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }

    .row-hover:hover { background-color: #f0f5ff; }

    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 400px 100%;
      animation: shimmer 1.4s infinite;
    }

    .input-focus:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      border-color: #2563EB;
    }
  `}</style>
);

// ─── Data ─────────────────────────────────────────────────────────────────────

type Status = "complete" | "running" | "queued" | "failed";

const STATS = { total: 24, passed: 17, failed: 7, avgScore: 78 };
const PIE_DATA = [{ name: "Passed", value: 17 }, { name: "Failed", value: 7 }];

const FILTERS = ["All", "Complete", "Running", "Queued", "Failed"] as const;
type FilterType = (typeof FILTERS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms?: number | null): string | null {
    if (!ms) return null;
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function getScoreStyle(score: number | null | undefined): { bg: string; text: string; border: string } {
    if (score === null || score === undefined) return { bg: "#F8FAFC", text: "#94A3B8", border: "#E2E8F0" };
    if (score >= 80) return { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" };
    if (score >= 60) return { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" };
    return { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" };
}

const STATUS_MAP: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
    complete: { label: "Complete", bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
    running: { label: "Running", bg: "#F5F3FF", text: "#7C3AED", dot: "#8B5CF6" },
    queued: { label: "Queued", bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8" },
    failed: { label: "Failed", bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444" },
};

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    }),
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

// ─── Subcomponents ────────────────────────────────────────────────────────────

// @ts-ignore
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 500, color: "#334155", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            {payload[0].name}: <strong>{payload[0].value}</strong>
        </div>
    );
}

function ScoreRing({ score }: { score: number | null | undefined }) {
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

function StatusBadge({ status }: { status: Status }) {
    const s = STATUS_MAP[status];
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

function PassFailBadge({ passed }: { passed: boolean | null | undefined }) {
    if (passed === null || passed === undefined) return <span style={{ color: "#CBD5E1", fontSize: 14, fontWeight: 600 }}>—</span>;
    return passed ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: "#059669" }}>
            <CheckCircle2 size={11} /> Pass
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#FEF2F2", color: "#DC2626" }}>
            <XCircle size={11} /> Fail
        </span>
    );
}

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

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string | number;
    sub: string;
    subColor?: string;
    icon: React.ReactNode;
    accent: string;
    delay: number;
}

function StatCard({ label, value, sub, subColor = "#94A3B8", icon, accent, delay }: StatCardProps) {
    return (
        <motion.div
            variants={fadeUp}
            custom={delay}
            className="bg-white rounded-2xl p-5 flex flex-col gap-3"
            style={{ border: "1px solid #F1F5F9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
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
                <div className="bricolage text-[2rem] font-extrabold leading-none" style={{ color: accent === "#2563EB" ? "#0F172A" : accent }}>
                    {value}
                </div>
                <div className="text-xs mt-1.5 font-medium" style={{ color: subColor }}>
                    {sub}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const [filter, setFilter] = useState<FilterType>("All");
    const [url, setUrl] = useState("");
    const [inputFocused, setInputFocused] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [runs, setRuns] = useState<Run[]>([]);
    const [isLoadingRuns, setIsLoadingRuns] = useState(true);
    const [runsError, setRunsError] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrev, setHasPrev] = useState(false);

    const { activeRuns } = useActiveRuns();
    const activeCount = activeRuns?.length || 0;

    useEffect(() => {
        let isMounted = true;
        const fetchRuns = async () => {
            setIsLoadingRuns(true);
            setRunsError(null);
            try {
                const statusVal = filter === "All" ? undefined : filter.toLowerCase();
                const response = await runsService.getRuns({
                    limit: 20,
                    order: 'desc',
                    page,
                    status: statusVal
                });
                if (isMounted) {
                    setRuns(response.data || ((response as any).data ? (response as any).data : response) || []);
                    setHasNext(response.hasNext || false);
                    setHasPrev(response.hasPrev || false);
                }
            } catch (err: any) {
                if (isMounted) setRunsError(err.message || 'Failed to fetch runs');
            } finally {
                if (isMounted) setIsLoadingRuns(false);
            }
        };
        fetchRuns();
        return () => { isMounted = false; };
    }, [page, filter]);

    const handleRunAnalysis = async () => {
        if (!url) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const data = await runsService.createRun({ url, mode: 'manual' });
            const id = data.runId || data.id;
            if (id) router.push(`/runs/${id}`);
            else throw new Error("No Run ID returned");
        } catch (err: any) {
            setSubmitError(err.message || 'Error creating run');
            setIsSubmitting(false);
        }
    };

    const handleFilterClick = (f: FilterType) => {
        if (filter === f) {
            setFilter("All");
        } else {
            setFilter(f);
        }
        setPage(1);
    };

    const filtered = runs;

    return (
        <>
            <FontStyle />

            <div className="min-h-screen" style={{ background: "#F7F9FF" }}>

                {/* ─── NAV ──────────────────────────────────────── */}
                <nav
                    className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5"
                    style={{
                        background: "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderBottom: "1px solid #EFF3FB",
                    }}
                >
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "#2563EB" }}
                        >
                            <Target size={15} style={{ color: "#fff" }} />
                        </div>
                        <span className="bricolage font-bold text-xl tracking-tight" style={{ color: "#0F172A" }}>
                            Orion
                        </span>
                        <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full ml-1"
                            style={{ background: "#EFF6FF", color: "#3B82F6", border: "1px solid #DBEAFE" }}
                        >
                            Beta
                        </span>
                    </div>

                    {/* Center nav */}
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "#64748B" }}>
                        {["Dashboard", "Integrations", "Docs"].map((item, i) => (
                            <button
                                key={item}
                                className="transition-colors hover:text-slate-900"
                                style={i === 0 ? { color: "#1D4ED8", fontWeight: 600 } : {}}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-3">
                        {/* Live badge */}
                        <div
                            className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
                            style={{
                                background: activeCount > 0 ? "#F0FDF4" : "#F8FAFC",
                                color: activeCount > 0 ? "#16A34A" : "#64748B",
                                border: activeCount > 0 ? "1px solid #BBF7D0" : "1px solid #E2E8F0"
                            }}
                        >
                            {activeCount > 0 && (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#22C55E" }} />
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22C55E" }} />
                                </span>
                            )}
                            {activeCount > 0 ? `${activeCount} active` : "0 idle"}
                        </div>

                        {/* Avatar */}
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)" }}
                        >
                            T
                        </div>
                    </div>
                </nav>

                {/* ─── HERO ─────────────────────────────────────── */}
                <section className="relative overflow-hidden bg-white" style={{ borderBottom: "1px solid #EFF3FB" }}>

                    {/* Dot grid background */}
                    <div className="dot-bg absolute inset-0 opacity-50 pointer-events-none" />

                    {/* Soft blue glow top-right */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            top: -80, right: -80,
                            width: 480, height: 480,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%)",
                        }}
                    />
                    {/* Soft sky glow bottom-left */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            bottom: -60, left: -60,
                            width: 360, height: 360,
                            borderRadius: "50%",
                            background: "radial-gradient(circle, rgba(186,230,255,0.3) 0%, transparent 70%)",
                        }}
                    />

                    {/* Decorative geometric rings */}
                    <div
                        className="absolute top-8 right-12 opacity-10 pointer-events-none"
                        style={{
                            width: 120, height: 120, borderRadius: "50%",
                            border: "2px solid #2563EB",
                        }}
                    />
                    <div
                        className="absolute top-14 right-18 opacity-6 pointer-events-none"
                        style={{
                            width: 80, height: 80, borderRadius: "50%",
                            border: "2px solid #2563EB",
                        }}
                    />

                    <div className="relative max-w-3xl mx-auto px-6 py-20 md:py-28 text-center">

                        {/* Eyebrow pill */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, ease: "backOut" }}
                            className="inline-flex items-center gap-2 mb-7"
                        >
                            <span
                                className="flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full"
                                style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #DBEAFE" }}
                            >
                                <Zap size={11} style={{ fill: "#1D4ED8" }} />
                                AI-powered website auditing &nbsp;·&nbsp; v2.4
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            className="bricolage font-extrabold tracking-tight leading-none mb-5"
                            style={{ fontSize: "clamp(2.4rem, 6vw, 3.75rem)", color: "#0F172A" }}
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        >
                            Know your site's health{" "}
                            <span
                                className="italic"
                                style={{
                                    color: "#2563EB",
                                    textDecorationLine: "underline",
                                    textDecorationStyle: "wavy",
                                    textDecorationColor: "#BFDBFE",
                                    textUnderlineOffset: 6,
                                }}
                            >
                                before
                            </span>
                            {" "}your users do.
                        </motion.h1>

                        {/* Subheading */}
                        <motion.p
                            className="text-lg leading-relaxed mb-10 max-w-xl mx-auto"
                            style={{ color: "#64748B" }}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.22 }}
                        >
                            Orion deploys AI agents across your site to surface performance gaps, broken flows, and accessibility issues — then delivers a clear, actionable score.
                        </motion.p>

                        {/* URL Input */}
                        <motion.div
                            className="flex items-stretch max-w-2xl mx-auto"
                            style={{
                                borderRadius: 16,
                                boxShadow: inputFocused
                                    ? "0 0 0 4px rgba(37, 99, 235, 0.12), 0 4px 20px rgba(37,99,235,0.1)"
                                    : "0 4px 20px rgba(15, 23, 42, 0.08)",
                                transition: "box-shadow 0.2s ease",
                            }}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.32 }}
                        >
                            {/* Input field */}
                            <div className="relative flex-1">
                                <Globe
                                    size={16}
                                    className="absolute top-1/2 -translate-y-1/2"
                                    style={{ left: 16, color: inputFocused ? "#2563EB" : "#94A3B8", transition: "color 0.2s" }}
                                />
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onFocus={() => setInputFocused(true)}
                                    onBlur={() => setInputFocused(false)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis()}
                                    disabled={isSubmitting}
                                    placeholder="https://yoursite.com"
                                    className="input-focus w-full pl-11 pr-4 text-sm"
                                    style={{
                                        height: 56,
                                        background: "#fff",
                                        border: "1.5px solid #E2E8F0",
                                        borderRight: "none",
                                        borderRadius: "16px 0 0 16px",
                                        color: "#0F172A",
                                        fontSize: 15,
                                        outline: "none",
                                        paddingLeft: 44,
                                        paddingRight: 16,
                                    }}
                                />
                            </div>

                            {/* CTA Button */}
                            <motion.button
                                onClick={handleRunAnalysis}
                                disabled={isSubmitting}
                                className="flex items-center justify-center gap-2 font-semibold text-white whitespace-nowrap"
                                style={{
                                    background: isSubmitting ? "#94A3B8" : "#2563EB",
                                    border: isSubmitting ? "1.5px solid #64748B" : "1.5px solid #1D4ED8",
                                    borderRadius: "0 16px 16px 0",
                                    padding: "0 28px",
                                    fontSize: 14,
                                    cursor: isSubmitting ? "not-allowed" : "pointer",
                                    letterSpacing: "0.01em",
                                }}
                                whileHover={!isSubmitting ? { background: "#1D4ED8" } : undefined}
                                whileTap={!isSubmitting ? { scale: 0.97 } : undefined}
                            >
                                {isSubmitting ? <Activity size={14} className="animate-spin text-white" /> : <Play size={14} style={{ fill: "white" }} />}
                                {isSubmitting ? "Starting..." : "Run Analysis"}
                            </motion.button>

                            {submitError && (
                                <div className="absolute -bottom-7 left-2 text-xs text-red-500 font-medium">
                                    {submitError}
                                </div>
                            )}
                        </motion.div>

                        {/* Hint row */}
                        <motion.div
                            className="flex items-center justify-center gap-5 mt-4 text-xs"
                            style={{ color: "#94A3B8" }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55 }}
                        >
                            {["Paste any public URL", "Results in under 3 min", "No sign-up required"].map((hint, i) => (
                                <span key={i} className="flex items-center gap-1">
                                    <CheckCircle2 size={11} style={{ color: "#86EFAC" }} />
                                    {hint}
                                </span>
                            ))}
                        </motion.div>

                    </div>
                </section>

                {/* ─── MAIN CONTENT ─────────────────────────────── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">

                    {/* ─── STATS BAR ──────────────────────────────── */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                    >
                        <StatCard
                            delay={0}
                            label="Total Runs"
                            value={STATS.total}
                            sub="All time"
                            accent="#2563EB"
                            icon={<BarChart3 size={15} />}
                        />
                        <StatCard
                            delay={1}
                            label="Passed"
                            value={STATS.passed}
                            sub={`${Math.round((STATS.passed / STATS.total) * 100)}% pass rate`}
                            accent="#059669"
                            subColor="#10B981"
                            icon={<CheckCircle2 size={15} />}
                        />
                        <StatCard
                            delay={2}
                            label="Failed"
                            value={STATS.failed}
                            sub={`${Math.round((STATS.failed / STATS.total) * 100)}% fail rate`}
                            accent="#DC2626"
                            subColor="#EF4444"
                            icon={<XCircle size={15} />}
                        />
                        <StatCard
                            delay={3}
                            label="Avg Score"
                            value={STATS.avgScore}
                            sub="out of 100"
                            accent="#D97706"
                            subColor="#F59E0B"
                            icon={<TrendingUp size={15} />}
                        />

                        {/* Donut chart card */}
                        <motion.div
                            variants={fadeUp}
                            custom={4}
                            className="bg-white rounded-2xl p-5 col-span-2 md:col-span-3 lg:col-span-1"
                            style={{ border: "1px solid #F1F5F9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                        >
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                                Pass / Fail
                            </span>
                            <div style={{ height: 80, marginTop: 4 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={PIE_DATA}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={24}
                                            outerRadius={36}
                                            paddingAngle={4}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                            stroke="none"
                                        >
                                            <Cell fill="#10B981" />
                                            <Cell fill="#EF4444" />
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#64748B" }}>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#10B981" }} />
                                    Pass · {STATS.passed}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#64748B" }}>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
                                    Fail · {STATS.failed}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ─── RUN HISTORY ────────────────────────────── */}
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
                                        {runs.length} audits · sorted by recency
                                    </p>
                                </div>
                            </div>

                            {/* Filter pills */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => handleFilterClick(f)}
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
                        {isLoadingRuns ? (
                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                <Activity size={28} className="animate-spin text-blue-500 mb-5" />
                                <p className="font-semibold text-slate-700 text-base">Loading history...</p>
                            </div>
                        ) : runsError ? (
                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                <AlertTriangle size={28} className="text-red-500 mb-5" />
                                <p className="font-semibold text-slate-700 text-base">Failed to fetch runs</p>
                                <p className="text-slate-400 text-sm mt-1.5 max-w-xs">{runsError}</p>
                            </div>
                        ) : filtered.length === 0 ? (
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
                                        {filtered.map((run, i) => (
                                            <motion.tr
                                                key={run.id}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
                                                className="row-hover"
                                                style={{
                                                    borderBottom: i < filtered.length - 1 ? "1px solid #F8FAFF" : "none",
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
                                                        <div>
                                                            <div
                                                                className="font-semibold text-sm truncate max-w-[200px]"
                                                                style={{ color: "#0F172A" }}
                                                            >
                                                                {run.url.replace("https://", "").replace("http://", "")}
                                                            </div>
                                                            {run.durationMs && (
                                                                <div
                                                                    className="flex items-center gap-1 mt-0.5 text-xs"
                                                                    style={{ color: "#94A3B8" }}
                                                                >
                                                                    <Clock size={10} />
                                                                    {formatDuration(run.durationMs)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td style={{ padding: "16px 16px" }}>
                                                    <StatusBadge status={run.status as Status} />
                                                </td>

                                                {/* Score */}
                                                <td style={{ padding: "16px 16px" }}>
                                                    <div className="flex items-center gap-2">
                                                        <ScoreRing score={run.overallScore} />
                                                        {run.overallScore !== undefined && run.overallScore !== null && (
                                                            <span className={`text-xs font-semibold ${getScoreColor(run.overallScore)}`}>
                                                                {getScoreLabel(run.overallScore)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Pass/Fail */}
                                                <td style={{ padding: "16px 16px" }}>
                                                    <PassFailBadge passed={run.passed} />
                                                </td>

                                                {/* Findings */}
                                                <td style={{ padding: "16px 16px" }}>
                                                    {run.findings && run.findings > 0 ? (
                                                        <span
                                                            className="flex items-center gap-1 text-xs font-medium"
                                                            style={{ color: run.findings > 15 ? "#DC2626" : run.findings > 5 ? "#D97706" : "#059669" }}
                                                        >
                                                            <AlertTriangle size={11} />
                                                            {run.findings}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#CBD5E1", fontSize: 13 }}>—</span>
                                                    )}
                                                </td>

                                                {/* Run At */}
                                                <td style={{ padding: "16px 16px" }}>
                                                    <span className="text-sm" style={{ color: "#94A3B8" }}>
                                                        {new Date(run.createdAt || Date.now()).toLocaleDateString()}
                                                    </span>
                                                </td>

                                                {/* Arrow */}
                                                <td style={{ padding: "16px 20px 16px 8px" }}>
                                                    <div
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                                        style={{ background: "#F0F5FF" }}
                                                    >
                                                        <ChevronRight size={14} style={{ color: "#3B82F6" }} />
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Table footer */}
                        {filtered.length > 0 && (
                            <div
                                className="px-6 py-3.5 flex items-center justify-between"
                                style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFF" }}
                            >
                                <span className="text-xs" style={{ color: "#94A3B8" }}>
                                    Showing {filtered.length} runs on page {page}
                                </span>
                                <div className="flex gap-4">
                                    <button
                                        disabled={!hasPrev}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        className="flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ color: hasPrev ? "#2563EB" : "#94A3B8" }}
                                    >
                                        Prev
                                    </button>
                                    <button
                                        disabled={!hasNext}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="flex items-center gap-1 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ color: hasNext ? "#2563EB" : "#94A3B8" }}
                                    >
                                        Next
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* ─── QUICK TIPS STRIP ────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                        {[
                            {
                                icon: <Zap size={16} />,
                                title: "Fast AI Analysis",
                                desc: "Agents crawl your pages, test interactions, and flag issues in under 3 minutes.",
                                accent: "#2563EB",
                            },
                            {
                                icon: <BarChart3 size={16} />,
                                title: "Scored & Ranked",
                                desc: "Every audit returns a 0–100 score with severity-ranked findings you can act on.",
                                accent: "#7C3AED",
                            },
                            {
                                icon: <Activity size={16} />,
                                title: "Track Over Time",
                                desc: "Run on every deploy to catch regressions before they affect real users.",
                                accent: "#059669",
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className="bg-white rounded-2xl p-5 flex gap-4 items-start"
                                style={{ border: "1px solid #F1F5F9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                            >
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: card.accent + "12", color: card.accent }}
                                >
                                    {card.icon}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm mb-1" style={{ color: "#0F172A" }}>
                                        {card.title}
                                    </div>
                                    <div className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>
                                        {card.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                </div>

                {/* ─── FOOTER ───────────────────────────────────── */}
                <footer
                    className="text-center py-8 text-xs"
                    style={{ color: "#CBD5E1", borderTop: "1px solid #F1F5F9", marginTop: 8 }}
                >
                    <span className="bricolage font-bold" style={{ color: "#94A3B8" }}>Orion</span>
                    &nbsp;·&nbsp; AI-powered website auditing &nbsp;·&nbsp; © 2025
                </footer>

            </div>
        </>
    );
}