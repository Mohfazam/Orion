"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Globe, GitBranch, CheckCircle2, XCircle, Clock, Calendar, Pencil, BarChart2, AlertTriangle, Save, X, Trash2, Star, GitCommit } from "lucide-react";
import { Repo, RunStatus } from "../../../types/orion";
import { useState } from "react";

function scoreStyle(score: number | null | undefined) {
  if (score === null || score === undefined) return { main: "#CBD5E1", light: "#F8FAFC", border: "#E2E8F0", label: "—" };
  if (score >= 90)   return { main: "#059669", light: "#ECFDF5", border: "#A7F3D0", label: "Excellent" };
  if (score >= 70)   return { main: "#D97706", light: "#FFFBEB", border: "#FDE68A", label: "Needs Improvement" };
                     return { main: "#DC2626", light: "#FEF2F2", border: "#FECACA", label: "Poor" };
}

const STATUS_STYLE: Record<RunStatus, { label: string; bg: string; text: string; dot: string }> = {
  complete: { label: "Complete", bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  running:  { label: "Running",  bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  queued:   { label: "Queued",   bg: "#F8FAFC", text: "#64748B", dot: "#94A3B8" },
  failed:   { label: "Failed",   bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444" },
};

function StatusBadge({ status }: { status: RunStatus }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.queued;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
      background: s.bg, color: s.text, border: `1px solid ${s.text}22`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ position: "relative", display: "flex", width: 7, height: 7 }}>
        {status === "running" && (
          <span className="ping-dot" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: s.dot, opacity: 0.5 }} />
        )}
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "block", position: "relative" }} />
      </span>
      {s.label}
    </span>
  );
}

function PassFailBadge({ passed }: { passed: boolean | null | undefined }) {
  if (passed === null || passed === undefined) return <span style={{ color: "#CBD5E1", fontSize: 12, fontWeight: 600 }}>—</span>;
  return passed ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}>
      <CheckCircle2 size={10} /> Pass
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
      <XCircle size={10} /> Fail
    </span>
  );
}

export function RepoCard({ repo, isEditing, onEdit, onCancelEdit, onSaveUrl, onDisconnect }: {
  repo: Repo;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveUrl: (newUrl: string) => Promise<void>;
  onDisconnect: () => void;
}) {
  const [editVal, setEditVal] = useState(repo.stagingUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const sc = scoreStyle(repo.lastRun?.overallScore);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveErr(null);
    try {
        await onSaveUrl(editVal);
    } catch(e: any) {
        setSaveErr(e.message || "Failed to update URL");
    } finally {
        setIsSaving(false);
    }
  };

  const getFormatDate = (dateString: string) => {
      if (!dateString) return "—";
      const d = new Date(dateString);
      return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric' })} · ${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return (
    <motion.div
      layout
      className="repo-card"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={isEditing ? { borderColor: "#2563EB", boxShadow: "0 0 0 4px rgba(37,99,235,0.10), 0 8px 24px rgba(37,99,235,0.12)" } : {}}
    >
      <div style={{ height: 4, background: sc.main, opacity: 0.7, flexShrink: 0 }} />

      <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="bricolage" style={{ fontWeight: 700, fontSize: 16, color: "#0F172A", lineHeight: 1.3, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#94A3B8", fontWeight: 500 }}>{repo.owner}/</span>
              <span>{repo.repo}</span>
            </div>
            
            {(repo as any).branch || (repo as any).lastCommit ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                  {(repo as any).branch && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>
                        <GitBranch size={10} /> {(repo as any).branch}
                      </span>
                  )}
                  {(repo as any).lastCommit && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>
                        <GitCommit size={10} /> {(repo as any).lastCommit}
                      </span>
                  )}
                </div>
            ) : null}
          </div>

          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: sc.light, border: `2.5px solid ${sc.border}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 0 4px ${sc.main}12`,
          }}>
            <span className="bricolage" style={{ fontSize: (repo.lastRun?.overallScore ?? null) !== null ? 18 : 16, fontWeight: 800, color: sc.main, lineHeight: 1 }}>
              {repo.lastRun?.overallScore ?? "—"}
            </span>
            {(repo.lastRun?.overallScore ?? null) !== null && (
              <span style={{ fontSize: 9, fontWeight: 700, color: sc.main + "99", marginTop: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {sc.label}
              </span>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ marginBottom: 14, overflow: "hidden" }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8", marginBottom: 6 }}>
                Edit Staging URL
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Globe size={13} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 10, color: "#2563EB", pointerEvents: "none" }} />
                  <input
                    type="url"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    disabled={isSaving}
                    autoFocus
                    className="input-glow"
                    style={{
                      width: "100%", height: 36, paddingLeft: 30, paddingRight: 10,
                      fontSize: 12, color: "#0F172A", fontFamily: "monospace",
                      background: "#F8FAFF", border: "1.5px solid #DBEAFE",
                      borderRadius: 10, outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isSaving ? "#94A3B8" : "#2563EB", color: "#fff", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: isSaving ? "not-allowed" : "pointer",
                    boxShadow: isSaving ? "none" : "0 2px 8px rgba(37,99,235,0.3)",
                  }}
                >
                  <Save size={14} />
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "#F8FAFC", border: "1.5px solid #E2E8F0",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  <X size={13} style={{ color: "#94A3B8" }} />
                </button>
              </div>
              {saveErr && <div style={{ color: "#DC2626", fontSize: 11, marginTop: 4, fontWeight: 600 }}>{saveErr}</div>}
            </motion.div>
          ) : (
            <motion.a
              key="url"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              href={repo.stagingUrl || "https://example.com"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 7, marginBottom: 14,
                padding: "8px 12px", borderRadius: 10,
                background: "#F8FAFF", border: "1px solid #EFF3FB",
                textDecoration: "none", transition: "border-color 0.14s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#BFDBFE")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#EFF3FB")}
            >
              <Globe size={12} style={{ color: "#2563EB", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {(repo.stagingUrl || "").replace(/^https?:\/\//, "")}
              </span>
            </motion.a>
          )}
        </AnimatePresence>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {(repo as any).findings && (
                <div style={{ background: "#FAFBFF", border: "1px solid #F1F5F9", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ color: "#CBD5E1" }}><AlertTriangle size={11} /></span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#CBD5E1" }}>Findings</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: (repo as any).findings > 15 ? "#DC2626" : (repo as any).findings > 5 ? "#D97706" : (repo as any).findings > 0 ? "#059669" : "#CBD5E1", fontVariantNumeric: "tabular-nums" }}>
                    {(repo as any).findings}
                  </div>
                </div>
            )}
            {(repo as any).duration && (
                <div style={{ background: "#FAFBFF", border: "1px solid #F1F5F9", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ color: "#CBD5E1" }}><Clock size={11} /></span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#CBD5E1" }}>Duration</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>{(repo as any).duration}</div>
                </div>
            )}
            <div style={{ background: "#FAFBFF", border: "1px solid #F1F5F9", borderRadius: 10, padding: "8px 10px", gridColumn: ((repo as any).duration || (repo as any).findings) ? "span 1" : "span 2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <span style={{ color: "#CBD5E1" }}><Calendar size={11} /></span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#CBD5E1" }}>
                  Last run
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>
                {repo.lastRun ? getFormatDate(repo.lastRun.createdAt).split(" · ")[0] : "—"}
              </div>
            </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {repo.lastRun ? (
            <>
              <StatusBadge status={repo.lastRun.status} />
              <PassFailBadge passed={repo.lastRun.passed} />
            </>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>No runs yet</span>
          )}
          
          {(repo as any).language && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: ((repo as any).languageColor || "#3178C6") + "18", color: ((repo as any).languageColor || "#3178C6"), border: `1px solid ${((repo as any).languageColor || "#3178C6")}30` }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: ((repo as any).languageColor || "#3178C6"), display: "inline-block" }} />
                {(repo as any).language}
              </span>
          )}
          {(repo as any).stars !== undefined && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>
                <Star size={10} style={{ fill: "#FCD34D", stroke: "#FCD34D" }} />
                {(repo as any).stars}
              </span>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #F1F5F9", padding: "12px 20px", background: "#FAFBFF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {repo.lastRun ? (
              <a
                href={`/runs/${repo.lastRun.runId}`}
                className="outline-btn"
                style={{ background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#DBEAFE"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; }}
              >
                <BarChart2 size={12} /> View Output
              </a>
          ) : (
             <span className="outline-btn" style={{ background: "#F8FAFC", color: "#94A3B8", borderColor: "#E2E8F0", cursor: "not-allowed" }}>
                 <BarChart2 size={12} /> View Output
             </span>
          )}

          <button
            onClick={isEditing ? onCancelEdit : () => { onEdit(); setEditVal(repo.stagingUrl); }}
            className="outline-btn"
            style={{
              background: isEditing ? "#FFFBEB" : "#F8FAFC",
              color: isEditing ? "#D97706" : "#64748B",
              borderColor: isEditing ? "#FDE68A" : "#E2E8F0",
            }}
          >
            <Pencil size={12} /> {isEditing ? "Editing…" : "Edit URL"}
          </button>
        </div>

        <button style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#FCA5A5", padding: "4px 6px", borderRadius: 6, transition: "color 0.13s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#DC2626"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#FCA5A5"; }}
          onClick={onDisconnect}
        >
          <Trash2 size={11} /> Disconnect
        </button>
      </div>
    </motion.div>
  );
}
