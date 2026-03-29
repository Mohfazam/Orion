"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GitFork, GitBranch, GitCommit, Star, Pencil, Trash2, Save, X, Globe, ExternalLink, Hash, Calendar, Activity, Play } from "lucide-react";
import { useState } from "react";
import { Repo } from "../../../../types/orion";

export interface RepoHeroProps {
  repo: Repo;
  isEditingUrl: boolean;
  onEditUrlToggle: (state: boolean) => void;
  onSaveUrl: (newUrl: string) => Promise<void>;
  onDisconnect: () => void;
}

export function RepoHero({ repo, isEditingUrl, onEditUrlToggle, onSaveUrl, onDisconnect }: RepoHeroProps) {
  const [editVal, setEditVal] = useState(repo.stagingUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveErr(null);
    try {
      await onSaveUrl(editVal);
      // Parent should set isEditingUrl false on success
    } catch (err: any) {
      setSaveErr(err.message || "Failed to update staging URL");
      setIsSaving(false);
    }
  };

  const getFormatDate = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return `${d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  const getFormatCommitTime = (dateString: string) => {
      if (!dateString) return "";
      const d = new Date(dateString);
      return `${d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: "#fff", borderRadius: 22, border: "1.5px solid #EFF3FB", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", marginBottom: 20, overflow: "hidden" }}
    >
      <div style={{ height: 5, background: "linear-gradient(90deg, #2563EB 0%, #60A5FA 60%, #BAE6FD 100%)" }} />

      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "#F0F5FF", border: "1.5px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GitFork size={20} style={{ color: "#2563EB" }} />
              </div>
              <div>
                <h1 className="bricolage" style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", lineHeight: 1.2 }}>
                  <span style={{ color: "#94A3B8", fontWeight: 600 }}>{repo.owner}/</span>{repo.repo}
                </h1>
                
                {/* Dynamically hidden details that might not exist in backend schema yet */}
                {((repo as any).branch || repo.createdAt || (repo as any).language || (repo as any).stars) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {(repo as any).branch && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", padding: "2px 8px", borderRadius: 999 }}>
                            <GitBranch size={10} /> {(repo as any).branch}
                            </span>
                        )}
                        {repo.createdAt && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#64748B" }}>
                            <GitCommit size={10} style={{ color: "#94A3B8" }} />
                            {/* using createdAt for commit time since lastCommit is absent */}
                            <span style={{ fontFamily: "monospace", color: "#2563EB" }}>sync</span>
                            <span style={{ color: "#CBD5E1" }}>·</span>
                            {getFormatCommitTime(repo.createdAt)}
                            </span>
                        )}
                        {(repo as any).language && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: (repo as any).languageColor || "#3178C6", background: ((repo as any).languageColor || "#3178C6") + "15", border: `1px solid ${((repo as any).languageColor || "#3178C6")}30`, padding: "2px 8px", borderRadius: 999 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: (repo as any).languageColor || "#3178C6", display: "inline-block" }} />
                            {(repo as any).language}
                            </span>
                        )}
                        {(repo as any).stars !== undefined && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>
                            <Star size={10} style={{ fill: "#FCD34D", stroke: "#FCD34D" }} /> {(repo as any).stars}
                            </span>
                        )}
                    </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (isEditingUrl) onEditUrlToggle(false);
                else {
                    setEditVal(repo.stagingUrl || ""); 
                    onEditUrlToggle(true);
                }
              }}
              className="outline-btn"
              disabled={isSaving}
              style={{
                background: isEditingUrl ? "#FFFBEB" : "#F8FAFC",
                color: isEditingUrl ? "#D97706" : "#475569",
                borderColor: isEditingUrl ? "#FDE68A" : "#E2E8F0",
                opacity: isSaving ? 0.6 : 1, cursor: isSaving ? "not-allowed" : "pointer"
              }}
            >
              <Pencil size={13} /> {isEditingUrl ? "Editing URL…" : "Edit Staging URL"}
            </button>
            <button
              onClick={onDisconnect}
              className="outline-btn"
              style={{ background: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FEE2E2"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; }}
            >
              <Trash2 size={13} /> Disconnect
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isEditingUrl ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: 18 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8", marginBottom: 8 }}>
                Staging URL
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 520 }}>
                  <Globe size={14} style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 13, color: "#2563EB", pointerEvents: "none" }} />
                  <input
                    type="url"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    disabled={isSaving}
                    autoFocus
                    className="input-glow"
                    style={{ width: "100%", height: 42, paddingLeft: 36, paddingRight: 14, fontSize: 13, color: "#0F172A", fontFamily: "monospace", background: "#F8FAFF", border: "1.5px solid #DBEAFE", borderRadius: 12, outline: "none" }}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ height: 42, display: "inline-flex", alignItems: "center", gap: 7, background: isSaving ? "#94A3B8": "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, padding: "0 18px", borderRadius: 12, border: "none", cursor: isSaving ? "not-allowed" : "pointer", boxShadow: isSaving ? "none" : "0 2px 8px rgba(37,99,235,0.28)", whiteSpace: "nowrap" }}
                >
                  <Save size={14} /> Save
                </button>
                <button
                  onClick={() => onEditUrlToggle(false)}
                  disabled={isSaving}
                  style={{ width: 42, height: 42, borderRadius: 12, background: "#F8FAFC", border: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: isSaving ? "not-allowed": "pointer" }}
                >
                  <X size={14} style={{ color: "#94A3B8" }} />
                </button>
              </div>
              {saveErr && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 4, fontWeight: 600 }}>{saveErr}</div>}
            </motion.div>
          ) : (
            <motion.div
              key="static"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ marginBottom: 18 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8", marginBottom: 8 }}>
                Staging URL
              </div>
              <a
                href={repo.stagingUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "#F8FAFF", border: "1.5px solid #EFF3FB", textDecoration: "none", transition: "border-color 0.14s", maxWidth: 520 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#EFF3FB"; }}
              >
                <Globe size={14} style={{ color: "#2563EB", flexShrink: 0 }} />
                <span style={{ fontFamily: "monospace", fontSize: 13, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {repo.stagingUrl || "No staging URL provided"}
                </span>
                <ExternalLink size={12} style={{ color: "#CBD5E1", flexShrink: 0 }} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
          {[
            { icon: <Hash size={12} />, label: "Installation ID", value: repo.installationId, mono: true },
            { icon: <Calendar size={12} />, label: "Connected", value: getFormatDate(repo.createdAt), mono: false },
            { icon: <Activity size={12} />, label: "Total runs", value: String(repo.runs?.length || 0), mono: false },
          ].map((m) => (
            <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#CBD5E1" }}>{m.icon}</span>
              <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{m.label}:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", fontFamily: m.mono ? "monospace" : undefined }}>
                {m.value}
              </span>
            </div>
          ))}

          <div style={{ marginLeft: "auto" }}>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 20px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(37,99,235,0.28)", whiteSpace: "nowrap" }}>
              <Play size={12} style={{ fill: "#fff" }} /> Run Analysis
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
