// packages/agents/src/nodes/fix.ts
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import * as fs from "fs";
import * as path from "path";
import { OrionState } from "../types";
import { askJSON } from "../llm";
import { db, runs, connectedRepos, eq, and } from "@repo/db";

const MAX_FILES_TO_FIX = 3;

const REVIEWABLE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".vue", ".py",
  ".go", ".java", ".rb", ".php", ".cs",
  ".html", ".css", ".scss",
];

const SOURCE_DIRS = [
  "src", "app", "pages", "components",
  "lib", "utils", "hooks", "api", "",
];

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
    path:    filePath,
    message: commitMessage,
    content: contentBase64,
    sha:     existing.sha as string,
    branch,
  });
}

// ── Scan mode helpers ──────────────────────────────────────────────────────

async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  fromBranch: string = "main"
): Promise<boolean> {
  try {
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
    console.error(`[fix_agent] Failed to create branch ${branchName}:`, err);
    return false;
  }
}

async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string = "main"
): Promise<{ number: number; html_url: string } | null> {
  try {
    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
    });
    return { number: data.number, html_url: data.html_url };
  } catch (err) {
    console.error("[fix_agent] Failed to create PR:", err);
    return null;
  }
}

async function getRepoFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<string[]> {
  const collected: string[] = [];
  const seen = new Set<string>();

  for (const dir of SOURCE_DIRS) {
    if (collected.length >= 10) break;

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: dir,
        ref:  branch,
      });

      if (!Array.isArray(data)) continue;

      for (const item of data) {
        if (
          item.type === "file" &&
          REVIEWABLE_EXTENSIONS.some((ext) => item.name.endsWith(ext)) &&
          !seen.has(item.path)
        ) {
          seen.add(item.path);
          collected.push(item.path);
          console.log(`[fix_agent] Found source file: ${item.path}`);
        }
      }
    } catch {
      continue;
    }
  }

  return collected;
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Performance agent findings use page URLs as file paths — not real GitHub paths
const isRealFilePath = (file?: string): boolean => {
  if (!file) return false;
  if (file.startsWith("http://") || file.startsWith("https://")) return false;
  return true;
};

// ── Fix Agent ──────────────────────────────────────────────────────────────

export async function fixAgent(state: OrionState): Promise<OrionState> {
  if (state.mode !== "ci" || state.overallScore >= 99) {
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

    const ciContext = runRow.ciContext as {
      pr?: number;
      sha: string;
      branch: string;
      repo: string;
      owner: string;
    };

    const { pr, sha, branch, repo, owner } = ciContext;

    // ── Get installationId ─────────────────────────────────────────────
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

    const octokit    = getOctokit(repoRow.installationId);
    const isScanMode = !pr;

    // ── Select findings to fix ─────────────────────────────────────────
    let toFix: typeof state.findings;

    if (isScanMode) {
      // Scan mode: take critical/high/medium findings with a real file path
      toFix = state.findings
        .filter(
          (f) =>
            (f.severity === "critical" || f.severity === "high" || f.severity === "medium") &&
            isRealFilePath(f.file)
        )
        .slice(0, MAX_FILES_TO_FIX);

      console.log(
        `[fix_agent] Scan mode — ${toFix.length} critical/high/medium finding(s) with real file paths`
      );
    } else {
      // PR mode: only fix files that were actually changed in the PR
      const prFiles = await getPRFiles(octokit, owner, repo, pr!);
      toFix = state.findings
        .filter(
          (f) =>
            (f.severity === "critical" || f.severity === "high") &&
            isRealFilePath(f.file) &&
            prFiles.some(
              (p) => f.file!.includes(p) || p.includes(f.file!)
            )
        )
        .slice(0, MAX_FILES_TO_FIX);

      console.log(
        `[fix_agent] PR mode — ${toFix.length} finding(s) matched changed files`
      );
    }

    if (toFix.length === 0) {
      console.log("[fix_agent] No actionable findings to fix.");
      return state;
    }

    // ── Scan mode: create a new branch ────────────────────────────────
    let fixBranch = branch;

    if (isScanMode) {
      const newBranchName = `orion-fixes/${state.runId}`;
      console.log(`[fix_agent] Creating branch ${newBranchName} from main...`);

      const created = await createBranch(octokit, owner, repo, newBranchName, "main");

      if (!created) {
        console.log("[fix_agent] Failed to create fix branch, skipping.");
        return state;
      }

      fixBranch = newBranchName;
    }

    // ── Fix each finding ───────────────────────────────────────────────
    let fixedCount = 0;

    for (const finding of toFix) {
      try {
        const fileRef = isScanMode ? "main" : sha;

        console.log(`[fix_agent] Reading ${finding.file} at ref ${fileRef}...`);

        const fileContent = await getFileContent(
          octokit, owner, repo, finding.file!, fileRef
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
          octokit, owner, repo,
          finding.file!,
          result.fixedContent,
          fixBranch,
          `fix(orion-qa): ${finding.title}`
        );

        fixedCount++;
        console.log(
          `[fix_agent] ✅ Committed fix for ${finding.file} — ${result.explanation}`
        );
      } catch (innerErr) {
        console.error(
          `[fix_agent] Failed to fix ${finding.file}:`,
          innerErr instanceof Error ? innerErr.message : innerErr
        );
      }
    }

    // ── Scan mode: open a PR (as long as the branch was created) ──────
    if (isScanMode && fixBranch !== branch) {
      console.log("[fix_agent] Opening fix PR...");

      const prBody = `## 🤖 Orion QA — Automated Fix PR

Orion ran a full QA audit on \`main\` and found **${state.findings.length} issues** (score: **${state.overallScore}/100**).
${fixedCount > 0
  ? `This PR contains AI-generated fixes for **${fixedCount}** of ${toFix.length} finding(s).`
  : `Orion attempted to fix ${toFix.length} finding(s) but could not auto-commit the changes. Please review the findings manually.`
}

### What to do
1. Review the changes in this PR
2. Merge when you're satisfied with the fixes
3. Run another QA scan to verify the score improved

---
*Auto-generated by [Orion QA Agent](https://github.com/apps/orion-qa-agent)*`;

      const createdPr = await createPullRequest(
        octokit, owner, repo,
        `fix(orion-qa): ${fixedCount > 0 ? `${fixedCount} automated fix(es)` : "QA audit complete"} — score: ${state.overallScore}/100`,
        prBody,
        fixBranch,
        "main"
      );

      if (createdPr) {
        console.log(
          `[fix_agent] ✅ Opened fix PR #${createdPr.number}: ${createdPr.html_url}`
        );

        const existingState = (runRow.state as Record<string, unknown>) ?? {};
        await db
          .update(runs)
          .set({
            state: {
              ...existingState,
              fixPrNumber: createdPr.number,
              fixPrUrl:    createdPr.html_url,
              fixBranch,
            },
          })
          .where(eq(runs.id, state.runUUID));
      }
    }
  } catch (err) {
    console.error(
      "[fix_agent] Outer error (pipeline continues):",
      err instanceof Error ? err.message : err
    );
  }

  return state;
}