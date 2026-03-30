"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ThemeToggle } from "../_components/ThemeToggle";
import { Target, LayoutDashboard, List, BookOpen, GitFork, Play } from "lucide-react";
import { runsService } from "../../services/runs.service";
import { Run } from "../../types/orion";
import { RunsFilter, StatusFilter, ModeFilter, PFFilter } from "./_components/RunsFilter";
import { RunsTable } from "./_components/RunsTable";
import { NewRunModal } from "./_components/NewRunModal";
import Link from "next/link";
import { usePathname } from "next/navigation";

const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

    *, *::before, *::after {
      font-family: 'DM Sans', sans-serif;
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    .bricolage { font-family: 'Bricolage Grotesque', sans-serif; }

    .dot-grid {
      background-image: radial-gradient(circle, #c7d7f0 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .row-hover:hover { background-color: var(--primary-bg-alt); cursor: pointer; }

    .input-glow:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.14);
      border-color: var(--primary) !important;
    }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #F8FAFF; }
    ::-webkit-scrollbar-thumb { background: var(--primary-border); border-radius: 999px; }

    .pill-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
      padding: 5px 12px; border-radius: 999px;
      transition: all 0.15s ease; cursor: pointer; border: none;
      white-space: nowrap;
    }
    .pill-btn:hover { transform: translateY(-1px); }
    .pill-active {
      background: var(--primary); color: #fff;
      box-shadow: 0 2px 10px rgba(37,99,235,0.28);
    }
    .pill-inactive {
      background: var(--bg-muted); color: var(--text-muted);
      border: 1px solid var(--border-muted);
    }
    .pill-inactive:hover { border-color: var(--primary-border-light); color: var(--primary-hover); }
    
    @keyframes ping {
      75%, 100% { transform: scale(1.8); opacity: 0; }
    }
  `}</style>
);

export default function RunsPage() {
  const pathname = usePathname();
  
  const [runs, setRuns] = useState<Run[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("All");
  const [passedFilter, setPassedFilter] = useState<PFFilter>("All");
  
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    
    const fetchRuns = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const queryParams: any = { page, limit: 20, order: 'desc' };
        
        if (statusFilter !== "All") queryParams.status = statusFilter.toLowerCase();
        if (modeFilter !== "All") queryParams.mode = modeFilter.toLowerCase();
        if (passedFilter !== "All") queryParams.passed = passedFilter === "Passed";
        
        const res = await runsService.getRuns(queryParams);
        
        if (active) {
            setRuns(res.data || []);
            setHasNext(res.hasNext || false);
            setHasPrev(res.hasPrev || false);
            setTotalCount(res.total || 0);
        }
      } catch (err: any) {
        if (active) {
            setError(err.message || "Failed to fetch runs. Please try again later.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    
    fetchRuns();
    return () => { active = false; };
  }, [page, statusFilter, modeFilter, passedFilter]);

  // Handlers for filters (reset page on change)
  const handleStatusChange = (s: StatusFilter) => { setStatusFilter(s); setPage(1); };
  const handleModeChange = (m: ModeFilter) => { setModeFilter(m); setPage(1); };
  const handlePassedChange = (p: PFFilter) => { setPassedFilter(p); setPage(1); };

  return (
    <>
      <FontStyle />

      <div style={{ minHeight: "100vh", background: "var(--bg-body)" }}>
        {/* NAV */}
        <nav
          style={{
            position: "sticky", top: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", height: 56,
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={15} style={{ color: "var(--text-inverse)" }} />
            </div>
            <span className="bricolage" style={{ fontWeight: 800, fontSize: 19, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
              Orion
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "var(--primary-bg)", color: "var(--primary-light)", border: "1px solid var(--primary-border)", marginLeft: 2 }}>
              Beta
            </span>
          </div>

          <ThemeToggle />
        </nav>

        {/* MAIN CONTENT */}
        <div style={{ maxWidth: 1536, margin: "0 auto", padding: "32px 20px 64px" }}>

          {/* PAGE HEADER */}
          <motion.div
            style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <h1 className="bricolage" style={{ fontSize: 32, fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em", marginBottom: 4 }}>
                All Runs
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-dim)", fontWeight: 500 }}>
                Every audit run across all your sites —&nbsp;
                <span style={{ color: "var(--primary)", fontWeight: 700 }}>{totalCount} total</span>
              </p>
            </div>

            <motion.button
              onClick={() => setModalOpen(true)}
              whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--primary)", color: "var(--text-inverse)",
                fontWeight: 700, fontSize: 14,
                padding: "11px 22px", borderRadius: 14,
                border: "none", cursor: "pointer",
                boxShadow: "0 2px 12px rgba(37,99,235,0.3)",
                transition: "background 0.15s",
              }}
            >
              <Play size={14} style={{ fill: "#fff" }} /> New Run
            </motion.button>
          </motion.div>

          <RunsFilter
            statusFilter={statusFilter}
            modeFilter={modeFilter}
            passedFilter={passedFilter}
            onStatusChange={handleStatusChange}
            onModeChange={handleModeChange}
            onPassedChange={handlePassedChange}
            totalCount={totalCount}
          />

          <RunsTable
            runs={runs}
            isLoading={isLoading}
            error={error}
            onNewRun={() => setModalOpen(true)}
            page={page}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onNextPage={() => setPage((p) => p + 1)}
            onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
            totalCount={totalCount}
          />
        </div>
      </div>
      
      <NewRunModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
