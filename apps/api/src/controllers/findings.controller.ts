import { Request, Response } from "express";
import { db, findings } from "@repo/db";
import { eq, and, SQL } from "drizzle-orm";

const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const fail = (res: Response, code: string, message: string, statusCode: number): void => {
  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};

// GET /runs/:runId/findings
export const getRunFindings = async (req: Request, res: Response): Promise<void> => {
  const runId = String(req.params["runId"]);
  const { severity, agent, confidence, order = "desc", page = "1", limit = "50" } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset   = (pageNum - 1) * limitNum;

  // First resolve UUID from runId
  const { runs } = await import("@repo/db");
  const { db: dbClient } = await import("@repo/db");

  const [run] = await db.select({ id: runs.id }).from(runs).where(eq(runs.runId, runId)).limit(1);
  if (!run) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  const conditions: SQL[] = [eq(findings.runId, run.id)];
  if (severity)   conditions.push(eq(findings.severity,   severity   as any));
  if (agent)      conditions.push(eq(findings.agent,      agent));
  if (confidence) conditions.push(eq(findings.confidence, confidence as any));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db.select().from(findings).where(where).limit(limitNum).offset(offset),
    db.select({ id: findings.id }).from(findings).where(where),
  ]);

  const total      = countResult.length;
  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json({
    success: true,
    data: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext:  pageNum < totalPages,
      hasPrev:  pageNum > 1,
    },
  });
};

// GET /findings/:findingId
export const getFinding = async (req: Request, res: Response): Promise<void> => {
  const findingId = String(req.params["findingId"]);

  const [finding] = await db
    .select()
    .from(findings)
    .where(eq(findings.id, findingId))
    .limit(1);

  if (!finding) {
    fail(res, "FINDING_NOT_FOUND", `No finding found with ID '${findingId}'.`, 404);
    return;
  }

  success(res, finding);
};