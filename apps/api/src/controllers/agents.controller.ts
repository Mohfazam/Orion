import { Request, Response } from "express";
import { db, runs, agentResults } from "@repo/db";
import { eq, and } from "drizzle-orm";

const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const fail = (res: Response, code: string, message: string, statusCode: number): void => {
  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};

const withDuration = (r: typeof agentResults.$inferSelect) => ({
  ...r,
  durationMs:
    r.startedAt && r.endedAt
      ? new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()
      : null,
});

// GET /runs/:runId/agents
export const getRunAgents = async (req: Request, res: Response): Promise<void> => {
  const runId = String(req.params["runId"]);

  const [run] = await db.select({ id: runs.id }).from(runs).where(eq(runs.runId, runId)).limit(1);
  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  const results = await db
    .select()
    .from(agentResults)
    .where(eq(agentResults.runId, run.id));

  success(res, results.map(withDuration));
};

// GET /runs/:runId/agents/:agent
export const getRunAgent = async (req: Request, res: Response): Promise<void> => {
  const runId     = String(req.params["runId"]);
  const agentName = String(req.params["agent"]);

  const [run] = await db.select({ id: runs.id }).from(runs).where(eq(runs.runId, runId)).limit(1);
  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  const [result] = await db
    .select()
    .from(agentResults)
    .where(and(eq(agentResults.runId, run.id), eq(agentResults.agent, agentName as any)))
    .limit(1);

  if (!result) {
    fail(res, "AGENT_NOT_FOUND", `No result for agent '${agentName}' in run '${runId}'.`, 404);
    return;
  }

  success(res, withDuration(result));
};