"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Globe, GitBranch, AlertCircle, ChevronRight, LayoutDashboard, Search } from "lucide-react";
import Link from "next/link";
import { reposService } from "../../../services/repos.service";
import { Repo } from "../../../types/orion";

const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');
    *, *::before, *::after { font-family: 'DM Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
    .bricolage { font-family: 'Bricolage Grotesque', sans-serif; }

    .input-glow:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.14);
      border-color: #2563EB !important;
    }

    .btn-hover { transition: all 0.14s ease; cursor: pointer; }
    .btn-hover:hover { transform: translateY(-1px); }
    .btn-hover:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  `}</style>
);

function Stepper({ step }: { step: 2 | 3 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, position: "relative" }}>
      {/* Background line */}
      <div style={{ position: "absolute", top: 12, left: 24, right: 24, height: 2, background: "#F1F5F9", zIndex: 0 }} />
      {/* Active line fill */}
      <motion.div 
        initial={{ width: "0%" }}
        animate={{ width: step === 3 ? "100%" : "50%" }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ position: "absolute", top: 12, left: 24, right: 24, height: 2, background: "#3B82F6", zIndex: 1, originX: 0 }} 
      />

      {/* Step 1 */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#fff", padding: "0 8px" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#10B981", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", boxShadow: "0 0 0 2px #A7F3D0" }}>
          <CheckCircle2 size={14} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>Connected</span>
      </div>

      {/* Step 2 */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#fff", padding: "0 8px" }}>
        <div style={{ 
          width: 26, height: 26, borderRadius: "50%", 
          background: step === 3 ? "#10B981" : "#EFF6FF", 
          color: step === 3 ? "#fff" : "#2563EB", 
          display: "flex", alignItems: "center", justifyContent: "center", 
          border: "2px solid #fff", 
          boxShadow: step === 3 ? "0 0 0 2px #A7F3D0" : "0 0 0 3px #DBEAFE",
          transition: "all 0.3s"
        }}>
          {step === 3 ? <CheckCircle2 size={14} /> : <span style={{ fontSize: 12, fontWeight: 800 }}>2</span>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: step === 3 ? "#059669" : "#1D4ED8" }}>Configure</span>
      </div>

      {/* Step 3 */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#fff", padding: "0 8px" }}>
        <div style={{ 
          width: 26, height: 26, borderRadius: "50%", 
          background: step === 3 ? "#EFF6FF" : "#F8FAFC", 
          color: step === 3 ? "#2563EB" : "#94A3B8", 
          display: "flex", alignItems: "center", justifyContent: "center", 
          border: "2px solid #fff", 
          boxShadow: step === 3 ? "0 0 0 3px #DBEAFE" : "0 0 0 2px #E2E8F0",
          transition: "all 0.3s"
        }}>
          <span style={{ fontSize: 12, fontWeight: 800 }}>3</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: step === 3 ? "#1D4ED8" : "#94A3B8" }}>Done</span>
      </div>
    </div>
  );
}

function ConnectCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isLoadingRepo, setIsLoadingRepo] = useState(true);
  const [repo, setRepo] = useState<Repo | null>(null);
  
  const [stagingUrl, setStagingUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchMatchedRepo = async () => {
      const installationId = searchParams.get("installation_id");
      if (!installationId) {
        if (active) setIsLoadingRepo(false);
        return;
      }

      try {
        const reposList = await reposService.getRepos();
        if (active) {
          const matched = reposList.find((r: Repo) => String(r.installationId) === String(installationId));
          if (matched) {
            setRepo(matched);
            setStagingUrl(matched.stagingUrl || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch repos for match:", err);
      } finally {
        if (active) setIsLoadingRepo(false);
      }
    };
    fetchMatchedRepo();
    return () => { active = false; };
  }, [searchParams]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repo || !stagingUrl.trim()) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      await reposService.updateStagingUrl(repo.id, stagingUrl.trim());
      setIsSuccess(true);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update staging URL. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F9FF", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <FontStyle />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%", maxWidth: 480,
          background: "#fff", borderRadius: 24,
          border: "1.5px solid #EFF3FB",
          boxShadow: "0 8px 32px rgba(15,23,42,0.04)",
          padding: "36px 40px", position: "relative",
          overflow: "hidden"
        }}
      >
        <AnimatePresence mode="wait">
          {isLoadingRepo ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #DBEAFE" }}>
                <div style={{ width: 20, height: 20, border: "3px solid #BFDBFE", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <div style={{ textAlign: "center" }}>
                <h2 className="bricolage" style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Connecting your repo...</h2>
                <p style={{ fontSize: 13, color: "#64748B" }}>Fetching installation details from GitHub.</p>
              </div>
            </motion.div>
          ) : !repo ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0", textAlign: "center" }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF2F2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, border: "4px solid #FEE2E2" }}>
                <AlertCircle size={32} />
              </div>
              <div>
                <h1 className="bricolage" style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 6 }}>Something went wrong</h1>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>We couldn't find your connected repo. The link might be invalid or the app may not have been fully installed.</p>
              </div>
              <Link href="/repos" className="btn-hover" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: "#F8FAFC", border: "1.5px solid #E2E8F0", color: "#475569", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                Go to Repos <ChevronRight size={14} />
              </Link>
            </motion.div>
          ) : isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
            >
              <Stepper step={3} />
              <div style={{ position: "relative", marginBottom: 20 }}>
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  style={{ width: 80, height: 80, borderRadius: "50%", background: "#ECFDF5", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", border: "5px solid #A7F3D0" }}
                >
                  <CheckCircle2 size={36} strokeWidth={2.5} />
                </motion.div>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#34D399", opacity: 0.2, animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite" }} />
              </div>
              <h1 className="bricolage" style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 8 }}>You're all set!</h1>
              <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 32, maxWidth: 320 }}>
                We're ready to start auditing your repository for potential vulnerabilities and performance regressions.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                <Link href={`/repos/${repo.id}`} className="btn-hover" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", borderRadius: 12, background: "#2563EB", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", width: "100%", boxShadow: "0 2px 12px rgba(37,99,235,0.28)" }}>
                  <Search size={16} /> View Repo Details
                </Link>
                <Link href="/" className="btn-hover" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", borderRadius: 12, background: "#F8FAFC", border: "1.5px solid #E2E8F0", color: "#475569", fontWeight: 700, fontSize: 14, textDecoration: "none", width: "100%" }}>
                  <LayoutDashboard size={15} /> Go to Dashboard
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <Stepper step={2} />
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 32 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0F5FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", border: "4px solid #DBEAFE", marginBottom: 16 }}>
                  <CheckCircle2 size={30} />
                </div>
                <h1 className="bricolage" style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 8 }}>GitHub App Connected!</h1>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>Your repository was successfully linked to Orion. Please set the staging environment URL that our agents should systematically audit.</p>
              </div>

              <div style={{ background: "#FAFBFF", border: "1px solid #EFF3FB", borderRadius: 12, padding: "16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GitBranch size={20} style={{ color: "#0F172A" }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8", marginBottom: 2 }}>Connected Repo</div>
                  <div className="bricolage" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "#64748B", fontWeight: 500 }}>{repo.owner}/</span>{repo.repo}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>Staging Environment URL</label>
                  <div style={{ position: "relative" }}>
                    <Globe size={15} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 14, color: "#64748B", pointerEvents: "none" }} />
                    <input
                      type="url"
                      required
                      placeholder="https://your-staging.com"
                      value={stagingUrl}
                      onChange={(e) => setStagingUrl(e.target.value)}
                      disabled={isSaving}
                      className="input-glow"
                      style={{ width: "100%", height: 46, paddingLeft: 38, paddingRight: 14, fontSize: 14, color: "#0F172A", fontFamily: "monospace", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, outline: "none" }}
                    />
                  </div>
                  {saveError && <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, marginTop: 6 }}>{saveError}</p>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  <button 
                    type="submit" 
                    disabled={isSaving || !stagingUrl}
                    className="btn-hover"
                    style={{ width: "100%", height: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 14, borderRadius: 12, border: "none", boxShadow: isSaving ? "none" : "0 2px 12px rgba(37,99,235,0.3)" }}
                  >
                    {isSaving ? (
                      <>
                        <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        Setting up...
                      </>
                    ) : (
                      "Start Monitoring"
                    )}
                  </button>
                  <p style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "center", fontWeight: 500 }}>
                    You can always change this later from the repos page.
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function ConnectCallbackPage() {
  return (
    <Suspense>
      <ConnectCallbackInner />
    </Suspense>
  );
}
