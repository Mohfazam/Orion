"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, LayoutDashboard, List, BookOpen, GitFork, Link2, CheckCircle2, XCircle, Zap, BarChart2 } from "lucide-react";
import { Repo } from "../../types/orion";
import { reposService, CONNECT_REPO_URL } from "../../services/repos.service";
import { RepoGrid } from "./_components/RepoGrid";
import Link from "next/link";
import { usePathname } from "next/navigation";

const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

    *, *::before, *::after {
      font-family: 'DM Sans', sans-serif;
      box-sizing: border-box;
      margin: 0; padding: 0;
    }
    .bricolage { font-family: 'Bricolage Grotesque', sans-serif; }

    .dot-grid {
      background-image: radial-gradient(circle, #c7d7f0 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .repo-card {
      background: #fff;
      border-radius: 20px;
      border: 1.5px solid #EFF3FB;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      transition: transform 0.22s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.22s cubic-bezier(0.22,1,0.36,1),
                  border-color 0.18s ease;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    .repo-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(37, 99, 235, 0.10), 0 2px 8px rgba(15,23,42,0.06);
      border-color: #BFDBFE;
    }

    .outline-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 700;
      padding: 8px 16px; border-radius: 10px;
      cursor: pointer; transition: all 0.14s ease;
      border: 1.5px solid; white-space: nowrap;
    }
    .outline-btn:hover { transform: translateY(-1px); }

    .input-glow:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.14);
      border-color: #2563EB !important;
    }

    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #F8FAFF; }
    ::-webkit-scrollbar-thumb { background: #DBEAFE; border-radius: 999px; }

    @keyframes ping { 75%, 100% { transform: scale(1.8); opacity: 0; } }
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    .ping-dot { animation: ping 1.2s cubic-bezier(0,0,0.2,1) infinite; }
  `}</style>
);

export default function ReposPage() {
  const pathname = usePathname();
  
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchRepos = async () => {
      try {
        setIsLoading(true);
        const data = await reposService.getRepos();
        if (active) {
            setRepos(Array.isArray(data) ? data : (data as any).data || []);
            setError(null);
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load repos");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchRepos();
    return () => { active = false; };
  }, []);

  const handleSaveUrl = async (repoId: string, newUrl: string) => {
    const updated = await reposService.updateStagingUrl(repoId, newUrl);
    setRepos(prev => prev.map(r => r.id === repoId ? { ...r, stagingUrl: updated.stagingUrl } : r));
    setEditingRepoId(null);
  };

  const handleDisconnect = async (repoId: string) => {
    if (!window.confirm("Are you sure you want to disconnect this repo?")) return;
    try {
      await reposService.deleteRepo(repoId);
      setRepos(prev => prev.filter(r => r.id !== repoId));
    } catch (err: any) {
      alert("Failed to disconnect: " + (err.message || ""));
    }
  };

  // Compute stats
  const totalRepos = repos.length;
  let passing = 0;
  let failing = 0;
  let running = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  repos.forEach(r => {
      const lr = r.lastRun;
      if (!lr) return;
      if (lr.status === 'running') running++;
      if (lr.status === 'complete' && lr.passed) passing++;
      if (lr.status === 'complete' && lr.passed === false) failing++;
      if (lr.status === 'failed') failing++;
      
      if (lr.overallScore !== null && lr.overallScore !== undefined) {
          scoreSum += lr.overallScore;
          scoredCount++;
      }
  });

  const avgScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : 0;

  return (
    <>
      <FontStyle />

      <div style={{ minHeight: "100vh", background: "#F7F9FF" }}>

        {/* ─── NAV ─────────────────────────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid #EFF3FB",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={15} style={{ color: "#fff" }} />
            </div>
            <span className="bricolage" style={{ fontWeight: 800, fontSize: 19, color: "#0F172A", letterSpacing: "-0.02em" }}>
              Orion
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#EFF6FF", color: "#3B82F6", border: "1px solid #DBEAFE", marginLeft: 2 }}>
              Beta
            </span>
          </div>

          {/* Center nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { label: "Dashboard", icon: <LayoutDashboard size={13} />, href: "/" },
              { label: "Runs",      icon: <List size={13} />,            href: "/runs" },
              { label: "Repos",     icon: <GitFork size={13} />,         href: "/repos" },
              { label: "Docs",      icon: <BookOpen size={13} />,        href: "/docs" },
            ].map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    padding: "6px 13px", borderRadius: 10,
                    textDecoration: "none",
                    background: active ? "#EFF6FF" : "transparent",
                    color: active ? "#1D4ED8" : "#64748B",
                    border: active ? "1px solid #DBEAFE" : "1px solid transparent",
                    transition: "all 0.14s",
                  }}
                >
                  {item.icon} {item.label}
                </Link>
              );
            })}
          </div>

          {/* Avatar */}
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800 }}>
            T
          </div>
        </nav>

        {/* ─── CONTENT ──────────────────────────────── */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 80px" }}>

          {/* ─── PAGE HEADER ───────────────────── */}
          <motion.div
            style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div>
              <h1 className="bricolage" style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 4 }}>
                Connected Repos
              </h1>
              <p style={{ fontSize: 14, color: "#94A3B8", fontWeight: 500 }}>
                GitHub repositories monitored by Orion —&nbsp;
                <span style={{ color: "#2563EB", fontWeight: 700 }}>{totalRepos} repos</span>
              </p>
            </div>

            <motion.a
              href={CONNECT_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.025, boxShadow: "0 4px 20px rgba(37,99,235,0.32)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#2563EB", color: "#fff",
                fontWeight: 700, fontSize: 14,
                padding: "11px 22px", borderRadius: 14,
                textDecoration: "none",
                boxShadow: "0 2px 12px rgba(37,99,235,0.28)",
                transition: "background 0.14s",
              }}
            >
              <Link2 size={15} /> Connect GitHub Repo
            </motion.a>
          </motion.div>

          {/* ─── Stats strip ──────────────────────── */}
          <motion.div
            style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            {[
              { label: "Total repos",    value: totalRepos.toString(),    color: "#2563EB", bg: "#EFF6FF", border: "#DBEAFE", icon: <GitFork size={13} />       },
              { label: "Passing",        value: passing.toString(),       color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", icon: <CheckCircle2 size={13} />   },
              { label: "Failing",        value: failing.toString(),       color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: <XCircle size={13} />        },
              { label: "Running now",    value: running.toString(),       color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: <Zap size={13} />            },
              { label: "Avg score",      value: avgScore.toString(),      color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: <BarChart2 size={13} />      },
            ].map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: s.bg, border: `1px solid ${s.border}` }}
              >
                <span style={{ color: s.color }}>{s.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: s.color + "99" }}>{s.label}</span>
                <span className="bricolage" style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </motion.div>

          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
                 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                 <p className="text-slate-500 font-semibold text-sm">Loading repos...</p>
            </div>
          ) : error ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
                 <p className="text-red-500 font-semibold text-sm">{error}</p>
            </div>
          ) : (
            <>
              <RepoGrid 
                 repos={repos} 
                 editingRepoId={editingRepoId}
                 onEdit={setEditingRepoId}
                 onCancelEdit={() => setEditingRepoId(null)}
                 onSaveUrl={handleSaveUrl}
                 onDisconnect={handleDisconnect}
              />
              {/* ─── GitHub integration callout ───────── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{
                  marginTop: 36,
                  padding: "20px 24px",
                  borderRadius: 18,
                  background: "#fff",
                  border: "1.5px dashed #DBEAFE",
                  display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: "#F0F5FF", border: "1px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GitFork size={20} style={{ color: "#2563EB" }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: "#0F172A", marginBottom: 2 }}>
                      Want to add more repos?
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>
                      Install the Orion GitHub App to connect additional repositories automatically.
                    </div>
                  </div>
                </div>
                <a
                  href={CONNECT_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "#1D4ED8", padding: "9px 18px", borderRadius: 12, background: "#EFF6FF", border: "1.5px solid #BFDBFE", textDecoration: "none", transition: "all 0.14s", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
                >
                  Open GitHub App <Target size={13} />
                </a>
              </motion.div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
