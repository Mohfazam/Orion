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

    .row-hover:hover { background: #F0F5FF; cursor: pointer; }

    .input-glow:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.14);
      border-color: #2563EB !important;
    }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #F8FAFF; }
    ::-webkit-scrollbar-thumb { background: #DBEAFE; border-radius: 999px; }

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
      <div style={{ minHeight: "100vh", background: "#F7F9FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748B", fontWeight: 600 }}>Loading repo details...</p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div style={{ minHeight: "100vh", background: "#F7F9FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <p style={{ color: "#DC2626", fontWeight: 700 }}>{error || "Repository not found."}</p>
        <Link href="/repos" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>&larr; Back to Repos</Link>
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
      <div style={{ minHeight: "100vh", background: "#F7F9FF" }}>
        
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", height: 56,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid #EFF3FB",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/repos"
              style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "#64748B", fontSize: 13, fontWeight: 500 }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F0F5FF", border: "1px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ArrowLeft size={13} style={{ color: "#2563EB" }} />
              </div>
              <span className="hidden sm:inline" style={{ display: "none" }}>Repos</span>
            </Link>

            <div style={{ width: 1, height: 20, background: "#E2E8F0" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={14} style={{ color: "#fff" }} />
              </div>
              <span className="bricolage" style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", letterSpacing: "-0.02em" }}>Orion</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronRight size={13} style={{ color: "#CBD5E1" }} />
              <Link href="/repos" style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, textDecoration: "none" }}>Repos</Link>
              <ChevronRight size={13} style={{ color: "#CBD5E1" }} />
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", background: "#F0F5FF", color: "#2563EB", padding: "2px 8px", borderRadius: 6 }}>
                {repo.owner}/{repo.repo}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { label: "Dashboard", icon: <LayoutDashboard size={13} />, href: "/",      active: false },
              { label: "Runs",      icon: <List size={13} />,            href: "/runs",  active: false },
              { label: "Repos",     icon: <GitFork size={13} />,         href: "/repos", active: true  },
              { label: "Docs",      icon: <BookOpen size={13} />,        href: "/docs",  active: false },
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: item.active ? 700 : 500, padding: "5px 12px", borderRadius: 10, textDecoration: "none", background: item.active ? "#EFF6FF" : "transparent", color: item.active ? "#1D4ED8" : "#64748B", border: item.active ? "1px solid #DBEAFE" : "1px solid transparent" }}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>

          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800 }}>T</div>
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
