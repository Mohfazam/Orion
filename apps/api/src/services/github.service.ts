import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import fs from "fs";
import path from "path";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getOctokit(installationId: string): Octokit {
  const privateKey = fs.readFileSync(
    path.resolve(process.env.GITHUB_PRIVATE_KEY_PATH!),
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

// ─── Status Checks ───────────────────────────────────────────────────────────

export async function postPendingStatus(
  owner: string,
  repo: string,
  sha: string,
  installationId: string
): Promise<void> {
  const octokit = getOctokit(installationId);

  await octokit.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state: "pending",
    context: "Orion QA Agent",
    description: "Running QA analysis...",
  });
}

export async function postCompletedStatus(
  owner: string,
  repo: string,
  sha: string,
  installationId: string,
  score: number,
  passed: boolean,
  runId: string
): Promise<void> {
  const octokit = getOctokit(installationId);

  await octokit.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state: passed ? "success" : "failure",
    context: "Orion QA Agent",
    description: `Score: ${score}/100 — ${passed ? "✅ Passed" : "❌ Failed"}`,
    target_url: `http://localhost:3000/runs/${runId}`,
  });
}

// ─── PR Comment ───────────────────────────────────────────────────────────────

export async function postPRComment(
  owner: string,
  repo: string,
  prNumber: number,
  installationId: string,
  score: number,
  passed: boolean,
  runId: string,
  findingsCount: number
): Promise<void> {
  const octokit = getOctokit(installationId);

  const badge   = passed ? "✅ Passed" : "❌ Failed";
  const emoji   = passed ? "🟢" : "🔴";

  const body = `## ${emoji} Orion QA Report

| | |
|---|---|
| **Score** | ${score}/100 |
| **Status** | ${badge} |
| **Findings** | ${findingsCount} issues detected |

[View Full Report →](http://localhost:3000/runs/${runId})

---
*Powered by [Orion QA Agent](https://github.com/apps/orion-qa-agent)*`;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}