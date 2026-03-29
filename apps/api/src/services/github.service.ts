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
      appId:          process.env.GITHUB_APP_ID!,
      privateKey,
      installationId: Number(installationId),
    },
  });
}

// ─── Status Checks ────────────────────────────────────────────────────────────

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
    state:       "pending",
    context:     "Orion QA Agent",
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
    state:       passed ? "success" : "failure",
    context:     "Orion QA Agent",
    description: `Score: ${score}/100 — ${passed ? "✅ Passed" : "❌ Failed"}`,
    target_url:  `http://localhost:3000/runs/${runId}`,
  });
}

// ─── PR Comment (on existing PR triggered by webhook) ────────────────────────

export async function postPRComment(
  owner: string,
  repo: string,
  prNumber: number,
  installationId: string,
  score: number,
  passed: boolean,
  runId: string,
  findingsCount: number,
  rootCause?: string
): Promise<void> {
  const octokit = getOctokit(installationId);

  const badge = passed ? "✅ Passed" : "❌ Failed";
  const emoji = passed ? "🟢" : "🔴";

  const rootCauseSection = rootCause
    ? `\n### 🧠 Root Cause Analysis\n> ${rootCause}\n`
    : "";

  const actionSection = passed
    ? `> ✅ This PR passed QA. Safe to merge.`
    : `> ⚠️ **Merge this PR and visit the Orion Dashboard to review AI-generated fixes.**
> Orion has analysed the issues and prepared suggested fixes. Once merged, open the dashboard, review each fix, and apply them with one click — Orion will open a new PR with all the changes.`;

  const body = `## ${emoji} Orion QA Report

| | |
|---|---|
| **Score** | ${score}/100 |
| **Status** | ${badge} |
| **Findings** | ${findingsCount} issues detected |
${rootCauseSection}
${actionSection}

[🔍 View Full Report & Apply Fixes →](http://localhost:3000/runs/${runId})

---
*Powered by [Orion QA Agent](https://github.com/apps/orion-qa-agent)*`;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}

// ─── Inline PR Review Comments ────────────────────────────────────────────────

export interface FindingForReview {
  title: string;
  detail: string;
  file?: string;
  nodeId?: string;
  fixSuggestion?: string;
  severity: string;
  line?: number;
}

export async function postInlineComments(
  owner: string,
  repo: string,
  prNumber: number,
  installationId: string,
  sha: string,
  findings: FindingForReview[]
): Promise<void> {
  try {
    const octokit = getOctokit(installationId);

    const { data: prFiles } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    const changedFilePaths = prFiles.map((f) => f.filename);

    const matchedComments = findings
      .filter((f) => {
        if (!f.file) return false;
        return changedFilePaths.some(
          (p) => f.file!.includes(p) || p.includes(f.file!)
        );
      })
      .slice(0, 5)
      .map((f) => {
        const matchedPath = changedFilePaths.find(
          (p) => f.file!.includes(p) || p.includes(f.file!)
        )!;

        const severityEmoji: Record<string, string> = {
          critical: "🔴",
          high:     "🟠",
          medium:   "🟡",
          low:      "🔵",
          info:     "⚪",
        };

        const emoji = severityEmoji[f.severity] ?? "⚪";

        return {
          path:     matchedPath,
          position: 1,
          body: [
            `## ${emoji} Orion QA — ${f.severity.toUpperCase()}: ${f.title}`,
            ``,
            f.detail,
            f.fixSuggestion
              ? `\n**💡 Suggested Fix:** ${f.fixSuggestion}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        };
      });

    if (matchedComments.length > 0) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id:   sha,
        event:       "COMMENT",
        body:        `Orion QA found ${findings.length} total issues. Here are findings related to files changed in this PR:\n\n[View Full Report & Apply Fixes →](http://localhost:3000)`,
        comments:    matchedComments,
      });
    } else {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id:   sha,
        event:       "COMMENT",
        body:        `Orion QA found **${findings.length} issues** on this site. None were directly linked to files changed in this PR — they may be pre-existing issues.\n\n[View Full Report & Apply Fixes →](http://localhost:3000)`,
      });
    }
  } catch (err) {
    console.error("[github] failed to post inline comments:", err);
  }
}

// ─── Read File Content ────────────────────────────────────────────────────────

export async function getFileContent(
  owner: string,
  repo: string,
  filePath: string,
  installationId: string,
  ref: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const octokit = getOctokit(installationId);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref,
    });

    if ("content" in data && data.type === "file") {
      const content = Buffer.from(
        data.content.replace(/\n/g, ""),
        "base64"
      ).toString("utf-8");

      return { content, sha: data.sha };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Commit Fixed File ────────────────────────────────────────────────────────

export async function commitFixedFile(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  fileSha: string,
  branch: string,
  installationId: string,
  findingTitle: string
): Promise<boolean> {
  try {
    const octokit = getOctokit(installationId);

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path:    filePath,
      message: `fix(orion): ${findingTitle}`,
      content: Buffer.from(content).toString("base64"),
      sha:     fileSha,
      branch,
    });

    return true;
  } catch (err) {
    console.error(`[github] failed to commit fix for ${filePath}:`, err);
    return false;
  }
}

// ─── Get PR Changed Files ─────────────────────────────────────────────────────

export async function getPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  installationId: string
): Promise<{ filename: string; patch?: string }[]> {
  try {
    const octokit = getOctokit(installationId);

    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    return data.map((f) => ({ filename: f.filename, patch: f.patch }));
  } catch {
    return [];
  }
}

// ─── Get Repo Files (for manual scan — reads from main branch) ────────────────

export async function getRepoFiles(
  owner: string,
  repo: string,
  installationId: string,
  branch: string = "main",
  dirPath: string = ""
): Promise<{ filename: string }[]> {
  try {
    const octokit = getOctokit(installationId);

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: dirPath,
      ref:  branch,
    });

    if (!Array.isArray(data)) return [];

    const reviewableExtensions = [
      ".ts", ".tsx", ".js", ".jsx", ".vue", ".py",
      ".go", ".java", ".rb", ".php", ".cs",
      ".html", ".css", ".scss",
    ];

    const files: { filename: string }[] = [];

    for (const item of data) {
      if (
        item.type === "file" &&
        reviewableExtensions.some((ext) => item.name.endsWith(ext))
      ) {
        files.push({ filename: item.path });
      }
    }

    return files;
  } catch {
    return [];
  }
}

// ─── Create Branch ────────────────────────────────────────────────────────────

export async function createBranch(
  owner: string,
  repo: string,
  installationId: string,
  branchName: string,
  fromBranch: string = "main"
): Promise<boolean> {
  try {
    const octokit = getOctokit(installationId);

    // Get SHA of the base branch
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });

    return true;
  } catch (err) {
    console.error(`[github] failed to create branch ${branchName}:`, err);
    return false;
  }
}

// ─── Create Pull Request ──────────────────────────────────────────────────────

export async function createPullRequest(
  owner: string,
  repo: string,
  installationId: string,
  title: string,
  body: string,
  head: string,
  base: string = "main"
): Promise<number | null> {
  try {
    const octokit = getOctokit(installationId);

    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    });

    return data.number;
  } catch (err) {
    console.error(`[github] failed to create PR:`, err);
    return null;
  }
}

// ─── Create Fix PR (used by fix_agent in scan mode) ──────────────────────────

export async function createFixPR(
  owner: string,
  repo: string,
  installationId: string,
  runId: string,
  score: number,
  findingsCount: number,
  rootCause?: string
): Promise<{ prNumber: number; branchName: string } | null> {
  try {
    const branchName = `orion-fixes/${runId}`;

    const created = await createBranch(
      owner,
      repo,
      installationId,
      branchName,
      "main"
    );

    if (!created) return null;

    const rootCauseSection = rootCause
      ? `\n### 🧠 Root Cause\n> ${rootCause}\n`
      : "";

    const prBody = `## 🤖 Orion QA — Automated Fix PR

Orion ran a full QA audit and found **${findingsCount} issues** (score: **${score}/100**).
This PR contains AI-generated fixes for the critical and high severity findings.
${rootCauseSection}
### What to do
1. Review the changes in this PR
2. Merge when you're satisfied with the fixes
3. Visit the [Orion Dashboard](http://localhost:3000/runs/${runId}) to see the full report

---
*Auto-generated by [Orion QA Agent](https://github.com/apps/orion-qa-agent)*`;

    const prNumber = await createPullRequest(
      owner,
      repo,
      installationId,
      `fix(orion-qa): Automated fixes — ${findingsCount} issues found (score: ${score}/100)`,
      prBody,
      branchName,
      "main"
    );

    if (!prNumber) return null;

    return { prNumber, branchName };
  } catch (err) {
    console.error(`[github] failed to create fix PR:`, err);
    return null;
  }
}