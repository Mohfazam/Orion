import { Request, Response } from "express";
import { db } from "@repo/db";
import {
  runs,
  findings,
  agentResults,
  graphExecutions,
} from "@repo/db";
import { eq, desc, ilike, and, inArray, SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runAgents } from "@repo/agents";

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low" | "info";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateRunId = () => `run_${nanoid(8)}`;

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const fail = (
  res: Response,
  code: string,
  message: string,
  statusCode: number
): void => {
  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};

// ─── POST /runs ───────────────────────────────────────────────────────────────

export const createRun = async (req: Request, res: Response): Promise<void> => {
  const { url, mode, prevRunId, ciContext } = req.body as {
    url: string;
    mode: string;
    prevRunId?: string;
    ciContext?: Record<string, unknown>;
  };

  if (!url || !mode) {
    fail(res, "MISSING_FIELD", "'url' and 'mode' are required.", 400);
    return;
  }
  if (!isValidUrl(url)) {
    fail(res, "INVALID_URL", `'${url}' is not a valid http/https URL.`, 400);
    return;
  }
  if (!["manual", "ci"].includes(mode)) {
    fail(res, "MISSING_FIELD", "'mode' must be 'manual' or 'ci'.", 400);
    return;
  }
  if (mode === "ci" && !ciContext) {
    fail(
      res,
      "MISSING_CI_CONTEXT",
      "ciContext (pr, sha, branch, repo, owner) is required when mode is 'ci'.",
      400
    );
    return;
  }

  const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  const activeRuns = await db
    .select({ runId: runs.runId, id: runs.id, createdAt: runs.createdAt })
    .from(runs)
    .where(
      and(
        eq(runs.url, url),
        inArray(runs.status, ["queued", "running"] as ("queued" | "running" | "complete" | "failed")[])
      )
    )
    .limit(1);

  if (activeRuns.length > 0) {
    const existingRun = activeRuns[0]!;
    const ageMs = Date.now() - new Date(existingRun.createdAt).getTime();

    if (ageMs < STALE_THRESHOLD_MS) {
      fail(
        res,
        "RUN_IN_PROGRESS",
        `A run is already active for ${url}. Wait for it to complete.`,
        409
      );
      return;
    }

    // Stale run — auto-fail it so a new one can proceed
    await db
      .update(runs)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(runs.id, existingRun.id));

    console.warn(`[runner] Stale run ${existingRun.runId} auto-failed after ${Math.round(ageMs / 1000)}s.`);
  }

  const runId = generateRunId();
  const safeMode = mode as "manual" | "ci";   // ← fixes RunMode error

  const [newRun] = await db
    .insert(runs)
    .values({
      runId,
      url,
      mode: safeMode,
      status: "queued",
      prevRunId: prevRunId ?? null,
      ciContext: ciContext ?? null,
    })
    .returning();

  // Fire and forget — agents run in background
  runAgents(newRun!.runId, newRun!.id, url, safeMode).catch((err) => {
    console.error(`[runner] unhandled error for ${newRun!.runId}:`, err);
  });

  success(
    res,
    {
      runId: newRun!.runId,
      id: newRun!.id,
      status: newRun!.status,
      url: newRun!.url,
      mode: newRun!.mode,
      createdAt: newRun!.createdAt,
    },
    201
  );
};

// ─── GET /runs ────────────────────────────────────────────────────────────────

export const listRuns = async (req: Request, res: Response): Promise<void> => {
  const {
    page = "1",
    limit = "20",
    status,
    mode,
    url,
    passed,
    order = "desc",
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(runs.status, status as "queued" | "running" | "complete" | "failed"));
  if (mode) conditions.push(eq(runs.mode, mode as "manual" | "ci"));
  if (url) conditions.push(ilike(runs.url, `%${url}%`));
  if (passed !== undefined) conditions.push(eq(runs.passed, passed === "true"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(runs)
      .where(where)
      .orderBy(order === "asc" ? runs.createdAt : desc(runs.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ id: runs.id }).from(runs).where(where),
  ]);

  const total = countResult.length;
  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  });
};

// ─── GET /runs/:runId ─────────────────────────────────────────────────────────

export const getRun = async (req: Request, res: Response): Promise<void> => {
  const runId = String(req.params["runId"]);

  const [run] = await db
    .select()
    .from(runs)
    .where(eq(runs.runId, runId))
    .limit(1);

  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  const [runFindings, runAgentResults, graphExecution] = await Promise.all([
    db.select().from(findings).where(eq(findings.runId, run.id)),
    db.select().from(agentResults).where(eq(agentResults.runId, run.id)),
    db.select().from(graphExecutions).where(eq(graphExecutions.runId, run.id)).limit(1),
  ]);

  const bySeverity: Record<Severity, number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };
  const byAgent: Record<string, number> = {};

  for (const f of runFindings) {
    const sev = f.severity as Severity;
    bySeverity[sev] += 1;
    byAgent[f.agent] = (byAgent[f.agent] ?? 0) + 1;
  }

  success(res, {
    ...run,
    findings: runFindings,
    agentResults: runAgentResults.map((r: any) => ({
      ...r,
      durationMs:
        r.startedAt && r.endedAt
          ? new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()
          : null,
    })),
    graphExecution: graphExecution[0] ?? null,
    summary: {
      totalFindings: runFindings.length,
      bySeverity,
      byAgent,
    },
  });
};

export const getRunStatus = async (req: Request, res: Response): Promise<void> => {
  const runId = String(req.params["runId"]);

  const [run] = await db
    .select({
      runId: runs.runId,
      status: runs.status,
      currentNode: runs.currentNode,
      overallScore: runs.overallScore,
      passed: runs.passed,
      completedAt: runs.completedAt,
    })
    .from(runs)
    .where(eq(runs.runId, runId))
    .limit(1);

  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  success(res, run);
};

// ─── GET /runs/active ─────────────────────────────────────────────────────────

export const getActiveRuns = async (_req: Request, res: Response): Promise<void> => {
  const activeRuns = await db
    .select({
      runId: runs.runId,
      url: runs.url,
      status: runs.status,
      currentNode: runs.currentNode,
      createdAt: runs.createdAt,
    })
    .from(runs)
    .where(inArray(runs.status, ["queued", "running"] as ("queued" | "running" | "complete" | "failed")[]))
    .orderBy(desc(runs.createdAt));

  success(res, { count: activeRuns.length, runs: activeRuns });
};

// ─── DELETE /runs/:runId ──────────────────────────────────────────────────────

export const cancelRun = async (req: Request, res: Response): Promise<void> => {
  const runId = String(req.params["runId"]);

  const [run] = await db
    .select({ id: runs.id, runId: runs.runId, status: runs.status })
    .from(runs)
    .where(eq(runs.runId, runId))
    .limit(1);

  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }
  if (run.status === "complete" || run.status === "failed") {
    fail(
      res,
      "RUN_ALREADY_COMPLETE",
      `Run '${runId}' is already ${run.status} and cannot be cancelled.`,
      409
    );
    return;
  }

  const [updated] = await db
    .update(runs)
    .set({ status: "failed", completedAt: new Date() })
    .where(eq(runs.id, run.id))
    .returning({ runId: runs.runId, status: runs.status });

  success(res, {
    runId: updated!.runId,
    status: updated!.status,
    message: "Run cancelled by user",
  });
};