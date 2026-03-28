import { runPipeline } from "./runner";
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
  const startedAt = new Date();

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

  console.log(`[pipeline] starting run ${runId} → ${url}`);

  const result = await runPipeline(
    initialState,
    [
      discoveryAgent,
      performanceAgent,
      scoringAgent,
      visualizationAgent,
    ],
    (name) => console.log(`[pipeline] ▶ ${name} started`),
    (name, state) => console.log(`[pipeline] ✓ ${name} done — score: ${state.overallScore}`)
  );

  if (!result.success) {
    console.error(`[pipeline] run ${runId} failed:`, result.error);
    await failRun(runUUID, result.error ?? "unknown error");
  } else {
    console.log(`[pipeline] run ${runId} complete — score: ${result.state.overallScore} passed: ${result.state.passed}`);
  }
};