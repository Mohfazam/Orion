import { OrionState, Finding } from "../types";
import { updateRunNode, saveAgentResult } from "../db";
import { eq } from "drizzle-orm";

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

const BUSINESS_IMPACT = (url?: string): number => {
  if (!url) return 1.0;
  const path = new URL(url).pathname.toLowerCase();
  if (/checkout|payment|billing|cart/.test(path))   return 2.0;
  if (/login|signup|auth|register/.test(path))       return 2.0;
  if (/dashboard|home|index/.test(path))             return 1.5;
  if (/admin|internal|debug/.test(path))             return 0.8;
  return 1.0;
  // TODO: make these patterns configurable per connected repo
};

const PASS_THRESHOLD = 70;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export async function scoringAgent(state: OrionState): Promise<OrionState> {
  const { runUUID, findings } = state;
  await updateRunNode(runUUID, "scoring_agent", "running");

  // ── Calculate total weight ─────────────────────────────────────────────
  let totalWeight = 0;

  for (const f of findings) {
    const sevScore    = SEVERITY_SCORE[f.severity]            ?? 1;
    const confMult    = CONFIDENCE_MULTIPLIER[f.confidence]   ?? 0.5;
    const impactMult  = BUSINESS_IMPACT(f.file);
    totalWeight      += sevScore * confMult * impactMult;
  }

  // ── Normalise to 0-100 score ───────────────────────────────────────────
  // max possible weight assumes 50 critical/high confidence/checkout findings
  const MAX_WEIGHT   = 50 * SEVERITY_SCORE["critical"]! * 1.0 * 2.0;
  const deduction    = clamp((totalWeight / MAX_WEIGHT) * 100, 0, 100);
  const overallScore = Math.round(100 - deduction);
  const passed       = overallScore >= PASS_THRESHOLD;

  // ── Persist ────────────────────────────────────────────────────────────
  await saveAgentResult(runUUID, "visualization", {
    totalWeight,
    overallScore,
    passed,
    threshold: PASS_THRESHOLD,
    findingsCount: findings.length,
  }, overallScore);

  await updateRunNode(runUUID, "scoring_agent", "complete");

  return {
    ...state,
    overallScore,
    passed,
    currentNode: "visualization_agent",
  };
}