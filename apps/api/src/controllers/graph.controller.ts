import { Request, Response } from "express";
import { db, runs, agentResults } from "@repo/db";
import { eq } from "drizzle-orm";

const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const fail = (res: Response, code: string, message: string, statusCode: number): void => {
  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};

const AGENT_ORDER = [
  { id: "discovery_agent",     label: "Discovery"     },
  { id: "performance_agent",   label: "Performance"   },
  { id: "scoring_agent",       label: "Scoring"       },
  { id: "visualization_agent", label: "Visualization" },
];

const EDGES = [
  { from: "discovery_agent",   to: "performance_agent"   },
  { from: "performance_agent", to: "scoring_agent"       },
  { from: "scoring_agent",     to: "visualization_agent" },
];

// GET /runs/:runId/graph
export const getRunGraph = async (req: Request, res: Response): Promise<void> => {
  const runId = String(req.params["runId"]);

  const [run] = await db
    .select({
      id:           runs.id,
      currentNode:  runs.currentNode,
      overallScore: runs.overallScore,
      passed:       runs.passed,
      status:       runs.status,
    })
    .from(runs)
    .where(eq(runs.runId, runId))
    .limit(1);

  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  const results = await db
    .select()
    .from(agentResults)
    .where(eq(agentResults.runId, run.id));

  // Build node status from agent results
  const nodes = AGENT_ORDER.map(({ id, label }) => {
    const result = results.find((r) => r.nodeId === id);

    let status: "queued" | "running" | "complete" | "failed" = "queued";

    if (result) {
      status = result.status as typeof status;
    } else if (run.currentNode === id) {
      status = "running";
    }

    const durationMs =
      result?.startedAt && result?.endedAt
        ? new Date(result.endedAt).getTime() - new Date(result.startedAt).getTime()
        : null;

    return {
      id,
      label,
      status,
      score:      result?.score ?? null,
      durationMs,
    };
  });

  success(res, {
    nodes,
    edges:        EDGES,
    currentNode:  run.currentNode,
    overallScore: run.overallScore,
    passed:       run.passed,
  });
};