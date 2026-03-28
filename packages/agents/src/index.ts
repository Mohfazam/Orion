import { runOrchestrated } from "./orchestrator";
import { discoveryAgent } from "./nodes/discovery";
import { performanceAgent } from "./nodes/performance";
import { scoringAgent } from "./nodes/scoring";
import { visualizationAgent } from "./nodes/visualization";
import { OrionState, RunMode } from "./types";
import { failRun } from "./db";

export const runAgents = async (
  runId: string,
  runUUID: string,
  url: string,
  mode: RunMode
): Promise<void> => {
  const initialState: OrionState = {
    runId,
    runUUID,
    url,
    mode,
    sitemap: [],
    findings: [],
    overallScore: 0,
    passed: false,
    currentNode: "discovery_agent",
  };

  try {
    await runOrchestrated(initialState, {
      discovery_agent:     discoveryAgent,
      performance_agent:   performanceAgent,
      scoring_agent:       scoringAgent,
      visualization_agent: visualizationAgent,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[runAgents] fatal error for ${runId}:`, error);
    await failRun(runUUID, error);
  }
};