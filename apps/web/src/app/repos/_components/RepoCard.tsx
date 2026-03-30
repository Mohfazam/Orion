"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Globe, GitBranch, CheckCircle2, XCircle, Clock, Calendar, Pencil, BarChart2, AlertTriangle, Save, X, Trash2, Star, GitCommit } from "lucide-react";
import { Repo, RunStatus } from "../../../types/orion";
import { useState } from "react";

function scoreStyle(score: number | null | undefined) {
  if (score === null || score === undefined) return { main: "var(--text-faint)", light: "var(--bg-muted)", border: "var(--border-muted)", label: "—" };
  if (score >= 90)   return { main: "var(--success-dark)", light: "var(--success-bg)", border: "#A7F3D0", label: "Excellent" };
  if (score >= 70)   return { main: "var(--warn)", light: "var(--warn-bg)", border: "#FDE68A", label: "Needs Improvement" };
                     return { main: "var(--danger-dark)", light: "var(--danger-bg)", border: "#FECACA", label: "Poor" };
}

const STATUS_STYLE: Record<RunStatus, { label: string; bg: string; text: string; dot: string }> = {
  complete: { label: "Complete", bg: "var(--primary-bg)", text: "var(--primary-hover)", dot: "var(--primary-light)" },
  running:  { label: "Running",  bg: "#F5F3FF", text: "#6D28D9", dot: "#8B5CF6" },
  queued:   { label: "Queued",   bg: "var(--bg-muted)", text: "var(--text-muted)", dot: "var(--text-dim)" },
  failed:   { label: "Failed",   bg: "var(--danger-bg)", text: "var(--danger-dark)", dot: "var(--danger)" },
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
  if (passed === null || passed === undefined) return <span style={{ color: "var(--text-faint)", fontSize: 12, fontWeight: 600 }}>—</span>;
  return passed ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--success-bg)", color: "var(--success-dark)", border: "1px solid #A7F3D0" }}>
      <CheckCircle2 size={10} /> Pass
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--danger-bg)", color: "var(--danger-dark)", border: "1px solid #FECACA" }}>
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
      style={isEditing ? { borderColor: "var(--primary)", boxShadow: "0 0 0 4px rgba(37,99,235,0.10), 0 8px 24px rgba(37,99,235,0.12)" } : {}}
    >
      <div style={{ height: 4, background: sc.main, opacity: 0.7, flexShrink: 0 }} />

      <div style={{ padding: "18px 20px 0", display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="bricolage" style={{ fontWeight: 700, fontSize: 16, color: "var(--text-main)", lineHeight: 1.3, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>{repo.owner}/</span>
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-dim)", fontWeight: 500 }}>
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
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-dim)", marginBottom: 6 }}>
                Edit Staging URL
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Globe size={13} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 10, color: "var(--primary)", pointerEvents: "none" }} />
                  <input
                    type="url"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    disabled={isSaving}
                    autoFocus
                    className="input-glow"
                    style={{
                      width: "100%", height: 36, paddingLeft: 30, paddingRight: 10,
                      fontSize: 12, color: "var(--text-main)", fontFamily: "monospace",
                      background: "#F8FAFF", border: "1.5px solid var(--primary-border)",
                      borderRadius: 10, outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isSaving ? "var(--text-dim)" : "var(--primary)", color: "var(--text-inverse)", border: "none",
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
                    background: "var(--bg-muted)", border: "1.5px solid var(--border-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: isSaving ? "not-allowed" : "pointer",
                  }}
                >
                  <X size={13} style={{ color: "var(--text-dim)" }} />
                </button>
              </div>
              {saveErr && <div style={{ color: "var(--danger-dark)", fontSize: 11, marginTop: 4, fontWeight: 600 }}>{saveErr}</div>}
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
                background: "#F8FAFF", border: "1px solid var(--border-subtle)",
                textDecoration: "none", transition: "border-color 0.14s",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--primary-border-light)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            >
              <Globe size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {(repo.stagingUrl || "").replace(/^https?:\/\//, "")}
              </span>
            </motion.a>
          )}
        </AnimatePresence>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {(repo as any).findings && (
                <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ color: "var(--text-faint)" }}><AlertTriangle size={11} /></span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)" }}>Findings</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: (repo as any).findings > 15 ? "var(--danger-dark)" : (repo as any).findings > 5 ? "var(--warn)" : (repo as any).findings > 0 ? "var(--success-dark)" : "var(--text-faint)", fontVariantNumeric: "tabular-nums" }}>
                    {(repo as any).findings}
                  </div>
                </div>
            )}
            {(repo as any).duration && (
                <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ color: "var(--text-faint)" }}><Clock size={11} /></span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)" }}>Duration</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{(repo as any).duration}</div>
                </div>
            )}
            <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", borderRadius: 10, padding: "8px 10px", gridColumn: ((repo as any).duration || (repo as any).findings) ? "span 1" : "span 2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <span style={{ color: "var(--text-faint)" }}><Calendar size={11} /></span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)" }}>
                  Last run
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
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
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>No runs yet</span>
          )}
          
          {(repo as any).language && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: ((repo as any).languageColor || "#3178C6") + "18", color: ((repo as any).languageColor || "#3178C6"), border: `1px solid ${((repo as any).languageColor || "#3178C6")}30` }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: ((repo as any).languageColor || "#3178C6"), display: "inline-block" }} />
                {(repo as any).language}
              </span>
          )}
          {(repo as any).stars !== undefined && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--text-dim)" }}>
                <Star size={10} style={{ fill: "#FCD34D", stroke: "#FCD34D" }} />
                {(repo as any).stars}
              </span>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-light)", padding: "12px 20px", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {repo.lastRun ? (
              <a
                href={`/runs/${repo.lastRun.runId}`}
                className="outline-btn"
                style={{ background: "var(--primary-bg)", color: "var(--primary-hover)", borderColor: "var(--primary-border-light)", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--primary-border)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--primary-bg)"; }}
              >
                <BarChart2 size={12} /> View Output
              </a>
          ) : (
             <span className="outline-btn" style={{ background: "var(--bg-muted)", color: "var(--text-dim)", borderColor: "var(--border-muted)", cursor: "not-allowed" }}>
                 <BarChart2 size={12} /> View Output
             </span>
          )}

          <button
            onClick={isEditing ? onCancelEdit : () => { onEdit(); setEditVal(repo.stagingUrl); }}
            className="outline-btn"
            style={{
              background: isEditing ? "var(--warn-bg)" : "var(--bg-muted)",
              color: isEditing ? "var(--warn)" : "var(--text-muted)",
              borderColor: isEditing ? "#FDE68A" : "var(--border-muted)",
            }}
          >
            <Pencil size={12} /> {isEditing ? "Editing…" : "Edit URL"}
          </button>
        </div>

        <button style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#FCA5A5", padding: "4px 6px", borderRadius: 6, transition: "color 0.13s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--danger-dark)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#FCA5A5"; }}
          onClick={onDisconnect}
        >
          <Trash2 size={11} /> Disconnect
        </button>
      </div>
    </motion.div>
  );
}
