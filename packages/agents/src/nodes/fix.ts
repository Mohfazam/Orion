// packages/agents/src/nodes/fix.ts
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import * as fs from "fs";
import * as path from "path";
import { OrionState } from "../types";
import { askJSON } from "../llm";
import { db, runs, connectedRepos, eq, and } from "@repo/db";

const MAX_FILES_TO_FIX = 3;

// ── Octokit factory ────────────────────────────────────────────────────────

function getOctokit(installationId: string): Octokit {
  const privateKey = fs.readFileSync(
    path.resolve(process.cwd(), "../../orion-qa-agent.pem"),
    "utf-8"
  );

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey,
      installationId: Number(installationId),
    },
  });
}

// ── GitHub helpers ─────────────────────────────────────────────────────────

async function getPRFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string[]> {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });
  return data.map((f) => f.filename);
}

async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  ref: string
): Promise<string> {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref,
  });

  if (!("content" in data) || typeof data.content !== "string") {
    throw new Error(`Could not read file: ${filePath}`);
  }

  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
}

async function commitFixedFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  fixedContent: string,
  branch: string,
  commitMessage: string
): Promise<void> {
  const { data: existing } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  });

  if (!("sha" in existing)) {
    throw new Error(`No SHA found for ${filePath}`);
  }

  const contentBase64 = Buffer.from(fixedContent, "utf-8").toString("base64");

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: commitMessage,
    content: contentBase64,
    sha: existing.sha as string,
    branch,
  });
}

// ── Fix Agent ──────────────────────────────────────────────────────────────

export async function fixAgent(state: OrionState): Promise<OrionState> {
  // Only run in CI mode with a failing score
  if (state.mode !== "ci" || state.overallScore >= 95) {
    console.log(
      `[fix_agent] Skipping — mode: ${state.mode}, score: ${state.overallScore}`
    );
    return state;
  }

  try {
    // ── Get run row for ciContext ──────────────────────────────────────
    const runRow = await db.query.runs.findFirst({
      where: eq(runs.id, state.runUUID),
    });

    if (!runRow?.ciContext) {
      console.log("[fix_agent] No ciContext found, skipping.");
      return state;
    }

    const { pr, sha, branch, repo, owner } = runRow.ciContext as {
      pr: number;
      sha: string;
      branch: string;
      repo: string;
      owner: string;
    };

    // ── Get installationId from connected_repos ────────────────────────
    const repoRow = await db.query.connectedRepos.findFirst({
      where: and(
        eq(connectedRepos.owner, owner),
        eq(connectedRepos.repo, repo)
      ),
    });

    if (!repoRow?.installationId) {
      console.log("[fix_agent] No installationId found, skipping.");
      return state;
    }

    const octokit = getOctokit(repoRow.installationId);

    // ── Get files changed in the PR ────────────────────────────────────
    const changedFiles = await getPRFiles(octokit, owner, repo, pr);

    // ── Filter to high/critical findings that match a changed file ─────
    const actionableFindings = state.findings.filter(
      (f) =>
        (f.severity === "critical" || f.severity === "high") &&
        f.file &&
        changedFiles.includes(f.file)
    );

    if (actionableFindings.length === 0) {
      console.log("[fix_agent] No actionable findings matched changed files.");
      return state;
    }

    const toFix = actionableFindings.slice(0, MAX_FILES_TO_FIX);
    console.log(`[fix_agent] Attempting to fix ${toFix.length} finding(s).`);

    // ── Fix each finding ───────────────────────────────────────────────
    for (const finding of toFix) {
      try {
        const fileContent = await getFileContent(
          octokit,
          owner,
          repo,
          finding.file!,
          sha
        );

        const result = await askJSON<{
          fixedContent: string;
          explanation: string;
        }>(
          `You are an expert code fixer. Given a QA finding and the full file content, return the fixed file.
Respond ONLY with valid JSON: { "fixedContent": "...", "explanation": "..." }
Return the ENTIRE file, not just the changed section. No markdown backticks inside the JSON strings.`,
          `File: ${finding.file}
Severity: ${finding.severity}
Issue: ${finding.title}
Detail: ${finding.detail}
Fix Suggestion: ${finding.fixSuggestion ?? "None"}

Current file content:
${fileContent}`
        );

        if (!result?.fixedContent) {
          console.log(`[fix_agent] LLM returned no fix for ${finding.file}`);
          continue;
        }

        await commitFixedFile(
          octokit,
          owner,
          repo,
          finding.file!,
          result.fixedContent,
          branch,
          `fix(orion-qa): ${finding.title}`
        );

        console.log(
          `[fix_agent] ✅ Committed fix for ${finding.file} — ${result.explanation}`
        );
      } catch (innerErr) {
        // Never crash the pipeline — log and move on
        console.error(
          `[fix_agent] Failed to fix ${finding.file}:`,
          innerErr instanceof Error ? innerErr.message : innerErr
        );
      }
    }
  } catch (err) {
    // Outer catch — pipeline always continues
    console.error(
      "[fix_agent] Outer error (pipeline continues):",
      err instanceof Error ? err.message : err
    );
  }

  return state;
}