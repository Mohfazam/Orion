// packages/agents/src/nodes/codeReview.ts
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import * as fs from "fs";
import * as path from "path";
import { OrionState, Finding } from "../types";
import { askJSON } from "../llm";
import { db, runs, connectedRepos, eq, and } from "@repo/db";
import { updateRunNode, saveAgentResult } from "../db";

const MAX_FILES_TO_REVIEW = 5;
const MAX_FILE_SIZE_CHARS = 8000; // truncate large files to avoid token overflow

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
): Promise<{ filename: string; patch?: string }[]> {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
  });
  return data.map((f) => ({ filename: f.filename, patch: f.patch }));
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

// ── LLM code review ────────────────────────────────────────────────────────

interface CodeReviewResult {
  findings: {
    severity: "critical" | "high" | "medium" | "low" | "info";
    confidence: "high" | "medium" | "low";
    title: string;
    detail: string;
    line?: number;
    fixSuggestion?: string;
  }[];
}

async function reviewFile(
  filename: string,
  content: string,
  patch?: string
): Promise<CodeReviewResult["findings"]> {
  const truncated = content.length > MAX_FILE_SIZE_CHARS
    ? content.slice(0, MAX_FILE_SIZE_CHARS) + "\n... (truncated)"
    : content;

  const result = await askJSON<CodeReviewResult>(
    `You are a senior code reviewer and security engineer.
Review the given file for issues including:
- Security vulnerabilities (XSS, SQL injection, hardcoded secrets, eval usage, prototype pollution)
- Performance problems (memory leaks, blocking operations, unoptimized assets)
- Accessibility issues (missing alt tags, poor contrast, no ARIA labels)
- Bad practices (no error handling, console.log with sensitive data, deprecated APIs)
- Broken references (missing imports, undefined variables)

Respond ONLY with valid JSON in this exact shape:
{
  "findings": [
    {
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "confidence": "high" | "medium" | "low",
      "title": "short title",
      "detail": "specific explanation of the issue",
      "line": <line number if identifiable, otherwise omit>,
      "fixSuggestion": "concrete fix suggestion"
    }
  ]
}

If there are no issues, return { "findings": [] }.
Be specific and accurate. Do not invent issues that aren't there.`,
    `File: ${filename}

${patch ? `Git diff (what changed):\n${patch}\n\n` : ""}Full file content:
${truncated}`
  );

  return result?.findings ?? [];
}

// ── Code Review Agent ──────────────────────────────────────────────────────

export async function codeReviewAgent(state: OrionState): Promise<OrionState> {
  // Only runs in CI mode
  if (state.mode !== "ci") {
    console.log("[code_review] Skipping — not CI mode");
    return state;
  }

  const startedAt = new Date();
  await updateRunNode(state.runUUID, "code_review_agent", "running");
  console.log(`[code_review] Starting PR code review for run ${state.runId}`);

  const newFindings: Finding[] = [];

  try {
    // ── Get ciContext from DB ────────────────────────────────────────────
    const runRow = await db.query.runs.findFirst({
      where: eq(runs.id, state.runUUID),
    });

    if (!runRow?.ciContext) {
      console.log("[code_review] No ciContext, skipping.");
      await updateRunNode(state.runUUID, "code_review_agent", "complete");
      return state;
    }

    const { pr, sha, repo, owner } = runRow.ciContext as {
      pr: number;
      sha: string;
      branch: string;
      repo: string;
      owner: string;
    };

    // ── Get installationId ───────────────────────────────────────────────
    const repoRow = await db.query.connectedRepos.findFirst({
      where: and(
        eq(connectedRepos.owner, owner),
        eq(connectedRepos.repo, repo)
      ),
    });

    if (!repoRow?.installationId) {
      console.log("[code_review] No installationId, skipping.");
      await updateRunNode(state.runUUID, "code_review_agent", "complete");
      return state;
    }

    const octokit = getOctokit(repoRow.installationId);

    // ── Get PR changed files ─────────────────────────────────────────────
    const prFiles = await getPRFiles(octokit, owner, repo, pr);

    // Filter to reviewable code files only
    const reviewableExtensions = [
      ".ts", ".tsx", ".js", ".jsx", ".vue", ".py",
      ".go", ".java", ".rb", ".php", ".cs", ".cpp", ".c",
      ".html", ".css", ".scss", ".json",
    ];

    const codeFiles = prFiles.filter((f) =>
      reviewableExtensions.some((ext) => f.filename.endsWith(ext))
    );

    const toReview = codeFiles.slice(0, MAX_FILES_TO_REVIEW);

    console.log(
      `[code_review] Reviewing ${toReview.length} file(s) out of ${prFiles.length} changed`
    );

    // ── Review each file ─────────────────────────────────────────────────
    for (const prFile of toReview) {
      try {
        console.log(`[code_review] Reviewing ${prFile.filename}...`);

        const content = await getFileContent(
          octokit,
          owner,
          repo,
          prFile.filename,
          sha
        );

        const filefindings = await reviewFile(
          prFile.filename,
          content,
          prFile.patch
        );

        console.log(
          `[code_review] ${prFile.filename} → ${filefindings.length} finding(s)`
        );

        for (const f of filefindings) {
          newFindings.push({
            agent: "code_review",
            severity: f.severity,
            confidence: f.confidence,
            title: f.title,
            detail: f.detail,
            file: prFile.filename,   // ← this is what enables inline PR comments
            line: f.line,
            fixSuggestion: f.fixSuggestion,
          });
        }
      } catch (fileErr) {
        console.error(
          `[code_review] Failed to review ${prFile.filename}:`,
          fileErr instanceof Error ? fileErr.message : fileErr
        );
        // continue to next file
      }
    }

    // ── Save agent result ────────────────────────────────────────────────
    await saveAgentResult(
      state.runUUID,
      "scoring", // reuse existing enum value — closest match
      {
        filesReviewed: toReview.length,
        findingsCount: newFindings.length,
        files: toReview.map((f) => f.filename),
      },
      0,
      startedAt
    );

    await updateRunNode(state.runUUID, "code_review_agent", "complete");

    console.log(
      `[code_review] Complete — ${newFindings.length} finding(s) across ${toReview.length} file(s)`
    );
  } catch (err) {
    console.error(
      "[code_review] Outer error (pipeline continues):",
      err instanceof Error ? err.message : err
    );
    await updateRunNode(state.runUUID, "code_review_agent", "complete");
  }

  return {
    ...state,
    findings: [...state.findings, ...newFindings],
    currentNode: "performance_agent",
  };
}