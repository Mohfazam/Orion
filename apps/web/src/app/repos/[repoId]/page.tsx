"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Target, LayoutDashboard, List, BookOpen, GitFork, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { reposService } from "../../../services/repos.service";
import { Repo } from "../../../types/orion";
import { RepoHero } from "./_components/RepoHero";
import { RepoStats } from "./_components/RepoStats";
import { RepoRunsTable } from "./_components/RepoRunsTable";

const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
    *, *::before, *::after { font-family: 'DM Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    .bricolage { font-family: 'Bricolage Grotesque', sans-serif; }

    .dot-grid {
      background-image: radial-gradient(circle, #c7d7f0 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .row-hover:hover { background: var(--primary-bg-alt); cursor: pointer; }

    .input-glow:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.14);
      border-color: var(--primary) !important;
    }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #F8FAFF; }
    ::-webkit-scrollbar-thumb { background: var(--primary-border); border-radius: 999px; }

    @keyframes ping { 75%, 100% { transform: scale(1.8); opacity: 0; } }
    .ping-dot { animation: ping 1.2s cubic-bezier(0,0,0.2,1) infinite; }

    .outline-btn {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700;
      padding: 9px 18px; border-radius: 11px;
      cursor: pointer; transition: all 0.14s ease;
      border: 1.5px solid; white-space: nowrap; text-decoration: none;
    }
    .outline-btn:hover { transform: translateY(-1px); }
  `}</style>
);

export default function RepoDetailPage() {
  const { repoId } = useParams() as { repoId: string };
  const router = useRouter();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  useEffect(() => {
    let active = true;
    if (!repoId) return;

    const fetchRepo = async () => {
      try {
        setIsLoading(true);
        const data = await reposService.getRepoById(repoId);
        if (active) {
          setRepo((data as any).data || data);
          setError(null);
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load repository.");
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchRepo();
    return () => { active = false; };
  }, [repoId]);

  const handleSaveUrl = async (newUrl: string) => {
    const updated = await reposService.updateStagingUrl(repoId, newUrl);
    setRepo(prev => prev ? { ...prev, stagingUrl: updated.stagingUrl } : null);
    setIsEditingUrl(false);
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect this repository? This action cannot be undone.")) return;
    try {
      await reposService.deleteRepo(repoId);
      router.push("/repos");
    } catch (err: any) {
      alert("Demolishing repo failed: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading repo details...</p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-body)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "var(--danger-dark)", fontWeight: 700 }}>{error || "Repository not found."}</p>
        <Link href="/repos" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>&larr; Back to Repos</Link>
      </div>
    );
  }

  const runs = repo.runs || [];
  const totalRuns = runs.length;
  let passed = 0;
  let failed = 0;
  let scoreSum = 0;
  let scoredCount = 0;

  for (const r of runs) {
      if (r.passed === true) passed++;
      if (r.passed === false) failed++;
      if (r.overallScore !== null && r.overallScore !== undefined) {
          scoreSum += r.overallScore;
          scoredCount++;
      }
  }

  const avgScore = scoredCount > 0 ? Math.round(scoreSum / scoredCount) : null;

  return (
    <>
      <FontStyle />
      <div style={{ minHeight: "100vh", background: "var(--bg-body)" }}>
        
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/repos"
              style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--primary-bg-alt)", border: "1px solid var(--primary-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={13} style={{ color: "var(--primary)" }} />
              </div>
              <span className="hidden sm:inline" style={{ display: "none" }}>Repos</span>
            </Link>

            <div style={{ width: 1, height: 20, background: "var(--border-muted)" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={14} style={{ color: "var(--text-inverse)" }} />
              </div>
              <span className="bricolage" style={{ fontWeight: 800, fontSize: 18, color: "var(--text-main)", letterSpacing: "-0.02em" }}>Orion</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronRight size={13} style={{ color: "var(--text-faint)" }} />
              <Link href="/repos" style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 500, textDecoration: "none" }}>Repos</Link>
              <ChevronRight size={13} style={{ color: "var(--text-faint)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", background: "var(--primary-bg-alt)", color: "var(--primary)", padding: "2px 8px", borderRadius: 6 }}>
                {repo.owner}/{repo.repo}
              </span>
            </div>
          </div>

          <div style={{ width: 34, height: 34 }} />
        </nav>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 80px" }}>
          
          <RepoHero
             repo={repo}
             isEditingUrl={isEditingUrl}
             onEditUrlToggle={setIsEditingUrl}
             onDisconnect={handleDisconnect}
             onSaveUrl={handleSaveUrl}
          />

          <RepoStats 
             totalRuns={totalRuns}
             failed={failed}
             passed={passed}
             avgScore={avgScore}
          />

          <RepoRunsTable 
             runs={runs}
          />

        </div>
      </div>
    </>
  );
}
