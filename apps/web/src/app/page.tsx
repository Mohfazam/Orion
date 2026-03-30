"use client";

import { motion } from "framer-motion";
import {
    Globe,
    Play,
    CheckCircle2,
    XCircle,
    Activity,
    ChevronRight,
    ArrowRight,
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
    LineChart,
    Line,
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

    .row-hover:hover { background-color: var(--primary-bg-alt); }

    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, var(--border-light) 25%, var(--border-muted) 50%, var(--border-light) 75%);
      background-size: 400px 100%;
      animation: shimmer 1.4s infinite;
    }

    .input-focus:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      border-color: var(--primary);
    }
  `}</style>
);

import { FilterType, CustomTooltip, fadeUp, stagger } from "./_components/shared";
import { NavBar } from "./_components/NavBar";
import { LastRunBanner } from "./_components/LastRunBanner";
import { StatCard } from "./_components/StatCard";
import { ScoreTrendCard } from "./_components/ScoreTrendCard";
import { TopUrlsStrip } from "./_components/TopUrlsStrip";
import { RunsTable } from "./_components/RunsTable";

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

    const [overviewStats, setOverviewStats] = useState({ total: 0, passed: 0, failed: 0 });
    const [topUrls, setTopUrls] = useState<{ url: string; count: number }[]>([]);
    const [scoreTrend, setScoreTrend] = useState<{ date: string; score: number }[]>([]);
    const [lastRun, setLastRun] = useState<Run | null>(null);
    const [isLoadingOverview, setIsLoadingOverview] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchOverviewData = async () => {
            try {
                const [totalRes, passedRes, failedRes, historyRes] = await Promise.all([
                    runsService.getRuns({ limit: 1, order: 'desc' }),
                    runsService.getRuns({ limit: 1, passed: true }),
                    runsService.getRuns({ limit: 1, passed: false }),
                    runsService.getRuns({ limit: 100, order: 'desc' })
                ]);
                
                if (isMounted) {
                    setOverviewStats({
                        total: totalRes.total || totalRes.data?.length || 0,
                        passed: passedRes.total || passedRes.data?.length || 0,
                        failed: failedRes.total || failedRes.data?.length || 0
                    });

                    const allRuns = historyRes.data || [];
                    const urlCounts = allRuns.reduce((acc, r) => {
                        acc[r.url] = (acc[r.url] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);
                    
                    const sortedUrls = Object.entries(urlCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([url, count]) => ({ url, count }));
                    setTopUrls(sortedUrls);

                    const scoredRuns = allRuns.filter(r => r.overallScore !== null && r.overallScore !== undefined)
                        .slice(0, 10)
                        .reverse();
                    
                    setScoreTrend(scoredRuns.map(r => ({
                        date: new Date(r.createdAt || Date.now()).toLocaleDateString(),
                        score: r.overallScore!
                    })));

                    if (allRuns.length > 0) {
                        setLastRun(allRuns[0] || null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch overview data", err);
            } finally {
                if (isMounted) setIsLoadingOverview(false);
            }
        };
        fetchOverviewData();
        return () => { isMounted = false; };
    }, []);

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
            const prevRun = runs.find(r => r.url === url && r.status === 'complete');
            const data = await runsService.createRun({ 
                url, 
                mode: 'manual',
                prevRunId: prevRun?.runId || prevRun?.id
            });
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

            <div className="min-h-screen" style={{ background: "var(--bg-body)" }}>

                {/* ─── NAV ──────────────────────────────────────── */}
                <NavBar activeCount={activeCount} />

                {/* ─── HERO ─────────────────────────────────────── */}
                <section className="relative overflow-hidden bg-[var(--bg-card)]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>

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
                            border: "2px solid var(--primary)",
                        }}
                    />
                    <div
                        className="absolute top-14 right-18 opacity-6 pointer-events-none"
                        style={{
                            width: 80, height: 80, borderRadius: "50%",
                            border: "2px solid var(--primary)",
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
                                style={{ background: "var(--primary-bg)", color: "var(--primary-hover)", border: "1px solid var(--primary-border)" }}
                            >
                                <Zap size={11} style={{ fill: "var(--primary-hover)" }} />
                                AI-powered website auditing &nbsp;·&nbsp; v2.4
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            className="bricolage font-extrabold tracking-tight leading-none mb-5"
                            style={{ fontSize: "clamp(2.4rem, 6vw, 3.75rem)", color: "var(--text-main)" }}
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        >
                            Know your site's health{" "}
                            <span
                                className="italic"
                                style={{
                                    color: "var(--primary)",
                                    textDecorationLine: "underline",
                                    textDecorationStyle: "wavy",
                                    textDecorationColor: "var(--primary-border-light)",
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
                            style={{ color: "var(--text-muted)" }}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.22 }}
                        >
                            Orion deploys AI agents across your site to surface performance gaps, broken flows, and accessibility issues — then delivers a clear, actionable score.
                        </motion.p>

                        {/* URL Input */}
                        <motion.div
                            className="relative flex items-stretch max-w-2xl mx-auto"
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
                                    style={{ left: 16, color: inputFocused ? "var(--primary)" : "var(--text-dim)", transition: "color 0.2s" }}
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
                                        background: "var(--bg-card)",
                                        border: "1.5px solid var(--border-muted)",
                                        borderRight: "none",
                                        borderRadius: "16px 0 0 16px",
                                        color: "var(--text-main)",
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
                                    background: isSubmitting ? "var(--text-dim)" : "var(--primary)",
                                    border: isSubmitting ? "1.5px solid var(--text-muted)" : "1.5px solid var(--primary-hover)",
                                    borderRadius: "0 16px 16px 0",
                                    padding: "0 28px",
                                    fontSize: 14,
                                    cursor: isSubmitting ? "not-allowed" : "pointer",
                                    letterSpacing: "0.01em",
                                }}
                                whileHover={!isSubmitting ? { background: "var(--primary-hover)" } : undefined}
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
                            style={{ color: "var(--text-dim)" }}
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
                <div className="max-w-[1536px] mx-auto px-4 sm:px-6 py-10 space-y-6">

                    {/* LAST RUN BANNER */}
                    <LastRunBanner isLoading={isLoadingOverview} lastRun={lastRun} />

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
                            value={isLoadingOverview ? "—" : overviewStats.total}
                            sub="All time"
                            accent="var(--primary)"
                            icon={<BarChart3 size={15} />}
                        />
                        <StatCard
                            delay={1}
                            label="Passed"
                            value={isLoadingOverview ? "—" : overviewStats.passed}
                            sub={isLoadingOverview || overviewStats.total === 0 ? "—" : `${Math.round((overviewStats.passed / overviewStats.total) * 100)}% pass rate`}
                            accent="var(--success-dark)"
                            subColor="var(--success)"
                            icon={<CheckCircle2 size={15} />}
                        />
                        <StatCard
                            delay={2}
                            label="Failed"
                            value={isLoadingOverview ? "—" : overviewStats.failed}
                            sub={isLoadingOverview || overviewStats.total === 0 ? "—" : `${Math.round((overviewStats.failed / overviewStats.total) * 100)}% fail rate`}
                            accent="var(--danger-dark)"
                            subColor="var(--danger)"
                            icon={<XCircle size={15} />}
                        />

                        <ScoreTrendCard isLoading={isLoadingOverview} scoreTrend={scoreTrend} delay={3} />

                        {/* Donut chart card */}
                        <motion.div
                            variants={fadeUp}
                            custom={4}
                            className="bg-[var(--bg-card)] rounded-2xl p-5 col-span-2 md:col-span-3 lg:col-span-1"
                            style={{ border: "1px solid var(--border-light)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                        >
                            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
                                Pass / Fail
                            </span>
                            <div style={{ height: 80, marginTop: 4 }}>
                                {isLoadingOverview ? (
                                    <div className="w-full h-full shimmer rounded-full border-[12px] border-white" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[{ name: "Passed", value: overviewStats.passed }, { name: "Failed", value: overviewStats.failed }]}
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
                                                <Cell fill="var(--success)" />
                                                <Cell fill="var(--danger)" />
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="flex justify-center gap-4 mt-1">
                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--success)" }} />
                                    Pass{!isLoadingOverview && ` · ${overviewStats.passed}`}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: "var(--danger)" }} />
                                    Fail{!isLoadingOverview && ` · ${overviewStats.failed}`}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* ─── MOST AUDITED URLS ────────────────────────────── */}
                    <TopUrlsStrip isLoading={isLoadingOverview} topUrls={topUrls} onSelectUrl={setUrl} />

                    {/* ─── RUN HISTORY ────────────────────────────── */}
                    <RunsTable 
                        runs={filtered} 
                        isLoading={isLoadingRuns} 
                        error={runsError} 
                        filter={filter} 
                        onFilterChange={handleFilterClick} 
                        page={page} 
                        hasNext={hasNext} 
                        hasPrev={hasPrev} 
                        onPrevPage={() => setPage(p => Math.max(1, p - 1))} 
                        onNextPage={() => setPage(p => p + 1)} 
                        totalCount={overviewStats.total} 
                    />

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
                                accent: "var(--primary)",
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
                                accent: "var(--success-dark)",
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className="bg-[var(--bg-card)] rounded-2xl p-5 flex gap-4 items-start"
                                style={{ border: "1px solid var(--border-light)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                            >
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: card.accent + "12", color: card.accent }}
                                >
                                    {card.icon}
                                </div>
                                <div>
                                    <div className="font-semibold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                                        {card.title}
                                    </div>
                                    <div className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
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
                    style={{ color: "var(--text-faint)", borderTop: "1px solid var(--border-light)", marginTop: 8 }}
                >
                    <span className="bricolage font-bold" style={{ color: "var(--text-dim)" }}>Orion</span>
                    &nbsp;·&nbsp; AI-powered website auditing &nbsp;·&nbsp; © 2025
                </footer>

            </div>
        </>
    );
}