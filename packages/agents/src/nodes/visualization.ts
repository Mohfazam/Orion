import { OrionState } from "../types";
import { finalizeRun, saveAgentResult, updateRunNode } from "../db";

export async function visualizationAgent(
  state: OrionState,
  focus?: string
): Promise<OrionState> {
  const { runUUID, overallScore, passed, findings, sitemap } = state;
  const startedAt = new Date();

  await updateRunNode(runUUID, "visualization_agent", "running");

  const summary = {
    totalFindings: findings.length,
    bySeverity: {
      critical: findings.filter((f) => f.severity === "critical").length,
      high:     findings.filter((f) => f.severity === "high").length,
      medium:   findings.filter((f) => f.severity === "medium").length,
      low:      findings.filter((f) => f.severity === "low").length,
      info:     findings.filter((f) => f.severity === "info").length,
    },
    byAgent: findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.agent] = (acc[f.agent] ?? 0) + 1;
      return acc;
    }, {}),
    pagesAudited: sitemap.length,
    overallScore,
    passed,
  };

  await saveAgentResult(
    runUUID,
    "visualization",
    summary,
    overallScore,
    startedAt
  );

  await finalizeRun(runUUID, overallScore, passed, startedAt);

  console.log(
    `[visualization] run complete — score: ${overallScore} | passed: ${passed} | findings: ${findings.length}`
  );

  return { ...state, currentNode: "complete" };
}