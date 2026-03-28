import { OrionState } from "../types";
import { finalizeRun, saveAgentResult, updateRunNode } from "../db";

// Receives the completed state and writes the final summary to DB
// TODO: trigger WebSocket event from here when WS layer is built

export async function visualizationAgent(state: OrionState): Promise<OrionState> {
  const { runUUID, overallScore, passed, findings, sitemap } = state;
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

  await saveAgentResult(runUUID, "visualization", summary, overallScore);
  await finalizeRun(runUUID, overallScore, passed, new Date());

  return { ...state, currentNode: "complete" };
}