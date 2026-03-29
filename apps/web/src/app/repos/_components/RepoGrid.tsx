"use client";

import { motion } from "framer-motion";
import { GitFork } from "lucide-react";
import { Repo } from "../../../types/orion";
import { RepoCard } from "./RepoCard";

function EmptyState() {
  return (
    <motion.div
      style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", border: "1.5px dashed #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#EFF6FF", border: "2px solid #DBEAFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GitFork size={30} style={{ color: "#93C5FD" }} />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * 90) * (Math.PI / 180);
          const r = 50;
          const x = Math.round(r * Math.cos(angle));
          const y = Math.round(r * Math.sin(angle));
          return (
            <div key={i} style={{ position: "absolute", top: `calc(50% + ${y}px - 4px)`, left: `calc(50% + ${x}px - 4px)`, width: 8, height: 8, borderRadius: "50%", background: i % 2 === 0 ? "#BFDBFE" : "#DDD6FE" }} />
          );
        })}
      </div>

      <h3 className="bricolage" style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
        No repos connected yet
      </h3>
      <p style={{ fontSize: 13, color: "#94A3B8", maxWidth: 340, lineHeight: 1.75, marginBottom: 24 }}>
        Connect your GitHub repositories to start monitoring every deployment automatically with AI-powered audits.
      </p>
      <a
        href="https://github.com/apps/orion-audit"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, padding: "11px 22px", borderRadius: 14, textDecoration: "none", boxShadow: "0 2px 12px rgba(37,99,235,0.3)" }}
      >
        <GitFork size={14} /> Connect GitHub Repo
      </a>
    </motion.div>
  );
}

export interface RepoGridProps {
  repos: Repo[];
  editingRepoId: string | null;
  onEdit: (repoId: string) => void;
  onCancelEdit: () => void;
  onSaveUrl: (repoId: string, newUrl: string) => Promise<void>;
  onDisconnect: (repoId: string) => void;
}

export function RepoGrid({
  repos,
  editingRepoId,
  onEdit,
  onCancelEdit,
  onSaveUrl,
  onDisconnect,
}: RepoGridProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
      gap: 20,
    }}>
      {repos.length === 0 ? (
        <EmptyState />
      ) : (
        repos.map((repo, i) => (
          <motion.div
            key={repo.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <RepoCard
              repo={repo}
              isEditing={editingRepoId === repo.id}
              onEdit={() => onEdit(repo.id)}
              onCancelEdit={onCancelEdit}
              onSaveUrl={(url) => onSaveUrl(repo.id, url)}
              onDisconnect={() => onDisconnect(repo.id)}
            />
          </motion.div>
        ))
      )}
    </div>
  );
}
