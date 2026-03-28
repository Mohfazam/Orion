import { db, runs, findings, agentResults } from "@repo/db";
import { eq } from "drizzle-orm";
import { Finding } from "./types";

export const updateRunNode = async (
  runUUID: string,
  node: string,
  status: "queued" | "running" | "complete" | "failed"
) => {
  await db
    .update(runs)
    .set({ currentNode: node, status: status === "complete" ? "complete" : "running" })
    .where(eq(runs.id, runUUID));
};

export const saveFindings = async (runUUID: string, items: Finding[]) => {
  if (items.length === 0) return;
  await db.insert(findings).values(
    items.map((f) => ({
      runId: runUUID,
      agent: f.agent,
      severity: f.severity,
      confidence: f.confidence,
      title: f.title,
      detail: f.detail,
      file: f.file ?? null,
      line: f.line ?? null,
      fixSuggestion: f.fixSuggestion ?? null,
      nodeId: `${f.agent}_agent`,
    }))
  );
};

export const saveAgentResult = async (
  runUUID: string,
  agent: "discovery" | "performance" | "hygiene" | "visualization",
  data: Record<string, unknown>,
  score?: number
) => {
  await db.insert(agentResults).values({
    runId: runUUID,
    agent,
    nodeId: `${agent}_agent`,
    attempt: 1,
    status: "complete",
    score: score ?? null,
    startedAt: new Date(),
    endedAt: new Date(),
    data,
    logs: null,
    error: null,
  });
};

export const finalizeRun = async (
  runUUID: string,
  overallScore: number,
  passed: boolean,
  startedAt: Date
) => {
  const completedAt = new Date();
  await db
    .update(runs)
    .set({
      status: "complete",
      overallScore,
      passed,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      currentNode: null,
    })
    .where(eq(runs.id, runUUID));
};

export const failRun = async (runUUID: string, errorMsg: string) => {
  await db
    .update(runs)
    .set({ status: "failed", completedAt: new Date(), currentNode: null })
    .where(eq(runs.id, runUUID));
  console.error(`[db] run ${runUUID} marked failed: ${errorMsg}`);
};