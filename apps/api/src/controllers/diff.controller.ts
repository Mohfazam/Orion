import { Request, Response } from "express";
import { db, runs, findings } from "@repo/db";
import { eq } from "drizzle-orm";

const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const fail = (res: Response, code: string, message: string, statusCode: number): void => {
  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};

// GET /runs/:runId/diff
export const getRunDiff = async (req: Request, res: Response): Promise<void> => {
  const runId       = String(req.params["runId"]);
  const compareWith = req.query["compareWith"] as string | undefined;

  // Fetch current run
  const [currentRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.runId, runId))
    .limit(1);

  if (!currentRun) {
    fail(res, "RUN_NOT_FOUND", `No run found with ID '${runId}'.`, 404);
    return;
  }

  // Resolve previous run
  const prevRunId = compareWith ?? currentRun.prevRunId;

  if (!prevRunId) {
    fail(res, "NO_PREVIOUS_RUN", "No previous run linked. Pass ?compareWith=run_xxx or set prevRunId when creating the run.", 404);
    return;
  }

  const [prevRun] = await db
    .select()
    .from(runs)
    .where(eq(runs.runId, prevRunId))
    .limit(1);

  if (!prevRun) {
    fail(res, "RUN_NOT_FOUND", `Previous run '${prevRunId}' not found.`, 404);
    return;
  }

  // Validate same URL
  if (currentRun.url !== prevRun.url) {
    fail(res, "RUNS_DIFFERENT_URL", `Runs target different URLs: '${currentRun.url}' vs '${prevRun.url}'.`, 400);
    return;
  }

  // Fetch findings for both runs in parallel
  const [currentFindings, prevFindings] = await Promise.all([
    db.select().from(findings).where(eq(findings.runId, currentRun.id)),
    db.select().from(findings).where(eq(findings.runId, prevRun.id)),
  ]);

  // Compute diff — match by title + file
  const newFindings = currentFindings.filter(
    (f) => !prevFindings.some((p) => p.title === f.title && p.file === f.file)
  );

  const resolvedFindings = prevFindings.filter(
    (f) => !currentFindings.some((c) => c.title === f.title && c.file === f.file)
  );

  const unchangedFindings = currentFindings.filter(
    (f) => prevFindings.some((p) => p.title === f.title && p.file === f.file)
  );

  const scoreDelta = (currentRun.overallScore ?? 0) - (prevRun.overallScore ?? 0);
  const verdict =
    scoreDelta > 0 ? "improvement" : scoreDelta < 0 ? "regression" : "unchanged";

  success(res, {
    current: {
      runId:         currentRun.runId,
      overallScore:  currentRun.overallScore,
      passed:        currentRun.passed,
      totalFindings: currentFindings.length,
    },
    previous: {
      runId:         prevRun.runId,
      overallScore:  prevRun.overallScore,
      passed:        prevRun.passed,
      totalFindings: prevFindings.length,
    },
    delta: {
      scoreDelta,
      verdict,
      newFindingsCount:       newFindings.length,
      resolvedFindingsCount:  resolvedFindings.length,
      unchangedFindingsCount: unchangedFindings.length,
    },
    newFindings,
    resolvedFindings,
    unchangedFindings,
  });
};