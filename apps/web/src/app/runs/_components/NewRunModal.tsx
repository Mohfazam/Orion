"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, X, Globe, Play, CheckCircle2, MousePointer2, GitBranch } from "lucide-react";
import { useState } from "react";
import { runsService } from "../../../services/runs.service";
import { useRouter } from "next/navigation";

export interface NewRunModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewRunModal({ isOpen, onClose }: NewRunModalProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"manual" | "ci">("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runsService.createRun({ url, mode });
      onClose();
      // Navigate to detail page
      router.push(`/runs/${data.runId || data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || "Failed to start run");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(15,23,42,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 480,
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target size={16} style={{ color: "#fff" }} />
                </div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, color: "#0F172A" }}>
                  Start New Audit
                </h2>
              </div>
              <p style={{ fontSize: 13, color: "#94A3B8", paddingLeft: 46 }}>
                Paste a URL — Orion will deploy 4 agents immediately.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              style={{ width: 34, height: 34, borderRadius: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
            >
              <X size={14} style={{ color: "#64748B" }} />
            </button>
          </div>

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(15,23,42,0.07)", border: "1.5px solid #E2E8F0" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Globe size={15} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 14, color: "#94A3B8", pointerEvents: "none" }} />
                <input
                  type="url"
                  placeholder="https://yoursite.com"
                  className="input-glow"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={loading}
                  style={{
                    width: "100%", height: 52,
                    paddingLeft: 40, paddingRight: 14,
                    fontSize: 14, color: "#0F172A",
                    background: "#fff", border: "none", outline: "none",
                  }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || !url}
                style={{
                  background: loading ? "#94A3B8" : !url ? "#bfdbfe" : "#2563EB", color: "#fff",
                  fontWeight: 700, fontSize: 13,
                  padding: "0 22px", border: "none",
                  cursor: loading || !url ? "not-allowed" : "pointer", display: "flex",
                  alignItems: "center", gap: 7,
                  whiteSpace: "nowrap", transition: "background 0.15s",
                }}
              >
                {loading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play size={12} style={{ fill: "#fff" }} />}
                {loading ? "Starting..." : "Run Analysis"}
              </button>
            </div>
            
            {error && <div style={{ color: "#DC2626", fontSize: 13, fontWeight: 600 }}>{error}</div>}

            <div style={{ display: "flex", gap: 16, paddingLeft: 2 }}>
              {["Crawls all linked pages", "Results in ~2 minutes", "4 AI agents"].map((h, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>
                  <CheckCircle2 size={11} style={{ color: "#86EFAC" }} /> {h}
                </span>
              ))}
            </div>

            <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0" }} />

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8", marginBottom: 8 }}>
                Run Mode
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "manual", label: "Manual", icon: <MousePointer2 size={13} /> },
                  { id: "ci", label: "CI", icon: <GitBranch size={13} /> },
                ].map((m) => {
                  const active = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as "manual" | "ci")}
                      disabled={loading}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        fontSize: 13, fontWeight: 600,
                        padding: "8px 16px", borderRadius: 10,
                        background: active ? "#EFF6FF" : "#F8FAFC",
                        color: active ? "#1D4ED8" : "#64748B",
                        border: active ? "1.5px solid #BFDBFE" : "1.5px solid #E2E8F0",
                        cursor: loading ? "default" : "pointer",
                      }}
                    >
                      {m.icon} {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
