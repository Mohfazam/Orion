import { Request, Response } from "express";
import crypto from "crypto";
import { db, connectedRepos, runs, findings, agentResults, eq } from "@repo/db";
import { runAgents } from "@repo/agents";
import { nanoid } from "nanoid";
import {
  postPendingStatus,
  postCompletedStatus,
  postPRComment,
  postInlineComments,
} from "../services/github.service";

// ─── Verify GitHub Signature ──────────────────────────────────────────────────

function verifySignature(req: Request): boolean {
  const secret    = process.env.GITHUB_WEBHOOK_SECRET!;
  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) return false;

  const hmac   = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch {
    return false;
  }
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export const handleGithubWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!verifySignature(req)) {
    res.status(401).json({ success: false, error: "Invalid signature" });
    return;
  }

  const event   = req.headers["x-github-event"] as string;
  const payload = req.body;

  // ── Installation event — save repo to DB ─────────────────────────────────
  if (event === "installation" && payload.action === "created") {
    const { installation, repositories } = payload;

    for (const repo of repositories ?? []) {
      await db
        .insert(connectedRepos)
        .values({
          owner:          installation.account.login,
          repo:           repo.name,
          installationId: String(installation.id),
          stagingUrl:     "",
        })
        .onConflictDoNothing();
    }

    res.status(200).json({ success: true });
    return;
  }

  // ── Pull Request event — trigger run ──────────────────────────────────────
  if (
    event === "pull_request" &&
    ["opened", "synchronize"].includes(payload.action)
  ) {
    const { pull_request, repository, installation } = payload;

    const owner          = repository.owner.login;
    const repo           = repository.name;
    const sha            = pull_request.head.sha;
    const prNumber       = pull_request.number;
    const branch         = pull_request.head.ref;
    const installationId = String(installation.id);

    // Look up staging URL from DB
    const connected = await db.query.connectedRepos.findFirst({
      where: eq(connectedRepos.repo, repo),
    });

    if (!connected?.stagingUrl) {
      console.warn(`[webhook] no staging URL for ${owner}/${repo} — skipping`);
      res.status(200).json({ success: true, skipped: true });
      return;
    }

    const runId = `run_${nanoid(6)}`;

    // ── Insert run into DB ────────────────────────────────────────────────
    const [newRun] = await db
      .insert(runs)
      .values({
        runId,
        url:       connected.stagingUrl,
        mode:      "ci",
        status:    "queued",
        ciContext: {
          pr:     prNumber,
          sha,
          branch,
          repo,
          owner,
        },
      })
      .returning();

    console.log(
      `[webhook] PR #${prNumber} → triggering run ${runId} for ${connected.stagingUrl}`
    );

    // Post pending status immediately
    await postPendingStatus(owner, repo, sha, installationId);

    // Trigger run in background — do NOT await
    runAgents(newRun!.runId, newRun!.id, connected.stagingUrl, "ci")
      .then(async () => {
        // ── Fetch completed run ─────────────────────────────────────────
        const run = await db.query.runs.findFirst({
          where: eq(runs.runId, runId),
        });

        const score  = run?.overallScore ?? 0;
        const passed = run?.passed       ?? false;

        // ── Fetch findings for inline comments ─────────────────────────
        const runFindings = run
          ? await db.query.findings.findMany({
              where: eq(findings.runId, run.id),
            })
          : [];

        const findingsCount = runFindings.length;

        // ── Fetch rootCause from scoring agent result ───────────────────
        let rootCause: string | undefined;
        if (run) {
          const scoringResult = await db.query.agentResults.findFirst({
            where: eq(agentResults.runId, run.id),
          });
          const data = scoringResult?.data as { rootCause?: string } | null;
          rootCause = data?.rootCause ?? undefined;
        }

        // ── Post to GitHub ──────────────────────────────────────────────
        await postCompletedStatus(owner, repo, sha, installationId, score, passed, runId);
        await postPRComment(owner, repo, prNumber, installationId, score, passed, runId, findingsCount, rootCause);

        if (runFindings.length > 0) {
          await postInlineComments(
            owner,
            repo,
            prNumber,
            installationId,
            sha,
            runFindings.map((f) => ({
              ...f,
              file:          f.file          ?? undefined,
              line:          f.line          ?? undefined,
              fixSuggestion: f.fixSuggestion ?? undefined,
              nodeId:        f.nodeId        ?? undefined,
            }))
          );
        }

        console.log(`[webhook] run ${runId} complete — posted status + comments to GitHub`);
      })
      .catch(async (err) => {
        console.error(`[webhook] run failed:`, err);
        await postCompletedStatus(owner, repo, sha, installationId, 0, false, runId);
      });

    res.status(200).json({ success: true, runId });
    return;
  }

  // ── All other events ──────────────────────────────────────────────────────
  res.status(200).json({ success: true });
};