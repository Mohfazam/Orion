import { OrionState } from "../types";
import { updateRunNode, saveAgentResult } from "../db";
import { askJSON } from "../llm";

// ── Weights ────────────────────────────────────────────────────────────────

const SEVERITY_SCORE: Record<string, number> = {
  critical: 10,
  high:     7,
  medium:   4,
  low:      2,
  info:     0.5,
};

const CONFIDENCE_MULTIPLIER: Record<string, number> = {
  high:   1.0,
  medium: 0.7,
  low:    0.4,
};

const BUSINESS_IMPACT = (file?: string): number => {
  if (!file) return 1.0;

  // file can be a URL (from performance agent) or a file path (from code_review)
  // handle both safely
  let path = file.toLowerCase();
  try {
    path = new URL(file).pathname.toLowerCase();
  } catch {
    // not a URL — it's a file path like "src/pages/checkout.tsx", use as-is
  }

  if (/checkout|payment|billing|cart/.test(path))  return 2.0;
  if (/login|signup|auth|register/.test(path))      return 2.0;
  if (/dashboard|home|index/.test(path))            return 1.5;
  if (/admin|internal|debug/.test(path))            return 0.8;
  return 1.0;
};

const PASS_THRESHOLD = 99;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// ── Root Cause Analysis ───────────────────────────────────────────────────

interface RootCauseResponse {
  rootCause: string;
}

async function analyzeRootCause(
  findings: OrionState["findings"],
  overallScore: number,
  url: string
): Promise<string | null> {
  if (findings.length === 0) return null;

  try {
    const findingsSummary = findings
      .slice(0, 20)
      .map((f) => `[${f.severity.toUpperCase()}] ${f.title} — ${f.detail}`)
      .join("\n");

    const result = await askJSON<RootCauseResponse>(
      `You are a senior QA engineer analyzing test results for a website.
Your job is to identify the single most impactful root cause behind the quality issues found.
Be specific, actionable, and concise — max 2 sentences.
Respond ONLY with valid JSON: { "rootCause": "your analysis here" }`,
      `Website: ${url}
Overall Score: ${overallScore}/100
Total Findings: ${findings.length}

Findings:
${findingsSummary}

What is the single biggest root cause driving this low score?`
    );

    return result?.rootCause ?? null;
  } catch {
    return null;
  }
}

// ── Scoring Agent ─────────────────────────────────────────────────────────

export async function scoringAgent(
  state: OrionState,
  focus?: string
): Promise<OrionState> {
  const { runUUID, findings, url } = state;
  const startedAt = new Date();
  await updateRunNode(runUUID, "scoring_agent", "running");

  console.log(`[scoring] calculating score for ${findings.length} findings`);

  // ── Calculate total weight ───────────────────────────────────────────
  let totalWeight = 0;

  for (const f of findings) {
    const sevScore   = SEVERITY_SCORE[f.severity]          ?? 1;
    const confMult   = CONFIDENCE_MULTIPLIER[f.confidence] ?? 0.5;
    const impactMult = BUSINESS_IMPACT(f.file);
    totalWeight     += sevScore * confMult * impactMult;
  }

  // ── Normalise to 0-100 score ─────────────────────────────────────────
  const MAX_WEIGHT   = 50 * SEVERITY_SCORE["critical"]! * 1.0 * 2.0;
  const deduction    = clamp((totalWeight / MAX_WEIGHT) * 100, 0, 100);
  const overallScore = Math.round(100 - deduction);
  const passed       = overallScore >= PASS_THRESHOLD;

  console.log(`[scoring] score: ${overallScore} | passed: ${passed}`);

  // ── Root Cause Analysis ──────────────────────────────────────────────
  let rootCause: string | null = null;
  if (!passed || findings.length >= 5) {
    console.log(`[scoring] running root cause analysis...`);
    rootCause = await analyzeRootCause(findings, overallScore, url);
    if (rootCause) {
      console.log(`[scoring] root cause: ${rootCause}`);
    }
  }

  // ── Persist ──────────────────────────────────────────────────────────
  await saveAgentResult(
    runUUID,
    "scoring",
    {
      totalWeight,
      overallScore,
      passed,
      threshold:     PASS_THRESHOLD,
      findingsCount: findings.length,
      rootCause:     rootCause ?? null,
    },
    overallScore,
    startedAt
  );

  await updateRunNode(runUUID, "scoring_agent", "complete");

  return {
    ...state,
    overallScore,
    passed,
    rootCause:   rootCause ?? undefined,
    currentNode: "visualization_agent",
  };
}