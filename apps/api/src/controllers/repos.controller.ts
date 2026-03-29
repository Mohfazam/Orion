import { Request, Response } from "express";
import { db, connectedRepos, runs } from "@repo/db";
import { eq, desc } from "drizzle-orm";

const success = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const fail = (res: Response, code: string, message: string, statusCode: number): void => {
  res.status(statusCode).json({ success: false, error: { code, message, statusCode } });
};

// ─── GET /repos ───────────────────────────────────────────────────────────────

export const listRepos = async (_req: Request, res: Response): Promise<void> => {
  const repos = await db.select().from(connectedRepos).orderBy(desc(connectedRepos.createdAt));

  const reposWithRuns = await Promise.all(
    repos.map(async (repo) => {
      const lastRun = await db
        .select({
          runId:        runs.runId,
          status:       runs.status,
          overallScore: runs.overallScore,
          passed:       runs.passed,
          createdAt:    runs.createdAt,
        })
        .from(runs)
        .where(eq(runs.url, repo.stagingUrl))
        .orderBy(desc(runs.createdAt))
        .limit(1);

      return {
        ...repo,
        lastRun: lastRun[0] ?? null,
      };
    })
  );

  success(res, reposWithRuns);
};

// ─── GET /repos/:repoId ───────────────────────────────────────────────────────

export const getRepo = async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params["repoId"]);

  const [repo] = await db
    .select()
    .from(connectedRepos)
    .where(eq(connectedRepos.id, repoId))
    .limit(1);

  if (!repo) {
    fail(res, "REPO_NOT_FOUND", `No repo found with ID '${repoId}'.`, 404);
    return;
  }

  const repoRuns = await db
    .select({
      runId:        runs.runId,
      mode:         runs.mode,
      status:       runs.status,
      overallScore: runs.overallScore,
      passed:       runs.passed,
      createdAt:    runs.createdAt,
      completedAt:  runs.completedAt,
      durationMs:   runs.durationMs,
    })
    .from(runs)
    .where(eq(runs.url, repo.stagingUrl))
    .orderBy(desc(runs.createdAt))
    .limit(20);

  success(res, { ...repo, runs: repoRuns });
};

// ─── POST /repos ──────────────────────────────────────────────────────────────

export const createRepo = async (req: Request, res: Response): Promise<void> => {
  const { owner, repo, installationId, stagingUrl } = req.body as {
    owner:          string;
    repo:           string;
    installationId: string;
    stagingUrl:     string;
  };

  if (!owner || !repo || !installationId || !stagingUrl) {
    fail(res, "MISSING_FIELD", "'owner', 'repo', 'installationId' and 'stagingUrl' are required.", 400);
    return;
  }

  const [newRepo] = await db
    .insert(connectedRepos)
    .values({ owner, repo, installationId, stagingUrl })
    .onConflictDoNothing()
    .returning();

  success(res, newRepo, 201);
};

// ─── PATCH /repos/:repoId ─────────────────────────────────────────────────────

export const updateRepo = async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params["repoId"]);
  const { stagingUrl } = req.body as { stagingUrl: string };

  if (!stagingUrl) {
    fail(res, "MISSING_FIELD", "'stagingUrl' is required.", 400);
    return;
  }

  const [updated] = await db
    .update(connectedRepos)
    .set({ stagingUrl })
    .where(eq(connectedRepos.id, repoId))
    .returning();

  if (!updated) {
    fail(res, "REPO_NOT_FOUND", `No repo found with ID '${repoId}'.`, 404);
    return;
  }

  success(res, updated);
};

// ─── DELETE /repos/:repoId ────────────────────────────────────────────────────

export const deleteRepo = async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params["repoId"]);

  const [deleted] = await db
    .delete(connectedRepos)
    .where(eq(connectedRepos.id, repoId))
    .returning();

  if (!deleted) {
    fail(res, "REPO_NOT_FOUND", `No repo found with ID '${repoId}'.`, 404);
    return;
  }

  success(res, { deleted: true });
};

// ─── GET /repos/connect ───────────────────────────────────────────────────────

export const connectRepo = async (_req: Request, res: Response): Promise<void> => {
  const appSlug = "orion-qa-agent";
  res.redirect(`https://github.com/apps/${appSlug}/installations/new`);
};

// ─── GET /repos/callback ──────────────────────────────────────────────────────

export const repoCallback = async (req: Request, res: Response): Promise<void> => {
  const { installation_id } = req.query as { installation_id: string };

  if (!installation_id) {
    fail(res, "MISSING_INSTALLATION_ID", "installation_id is required.", 400);
    return;
  }

  res.redirect(`http://localhost:3000/connect/callback?installation_id=${installation_id}`);
};