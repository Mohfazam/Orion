import { OrionState } from "./types";
import { askJSON } from "./llm";
import { failRun, updateRunNode } from "./db";
import { logger } from "@repo/realtime";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentName =
  | "discovery_agent"
  | "performance_agent"
  | "scoring_agent"
  | "visualization_agent";

type AgentFn = (state: OrionState, focus?: string) => Promise<OrionState>;

interface OrchestratorDecision {
  next: AgentName | "END";
  reason: string;
  focus?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_STEPS = 10;
const MAX_AGENT_RETRIES = 2;
const AGENT_ORDER: AgentName[] = [
  "discovery_agent",
  "performance_agent",
  "scoring_agent",
  "visualization_agent",
];

// ─── Orchestrator Prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are the QA Orchestrator for Orion — an autonomous web quality testing platform.
You manage 4 specialist agents and decide which one runs next based on the current pipeline state.

AGENTS:
- discovery_agent    → Crawls the website using a real browser. Maps all pages, finds broken links, analyses content. MUST always run first.
- performance_agent  → Runs Lighthouse on discovered pages. Measures Core Web Vitals (LCP, CLS, FCP, TBT). Requires discovery_agent to have run first.
- scoring_agent      → Takes all findings from previous agents, applies weighted scoring formula, produces 0-100 score and pass/fail verdict. Run after all testing agents complete.
- visualization_agent → Saves final results to DB, marks run complete. MUST always run last.

RULES:
1. discovery_agent MUST run first — always.
2. performance_agent MUST run after discovery_agent.
3. scoring_agent MUST run after all testing is done.
4. visualization_agent MUST run last — only after scoring_agent.
5. NEVER suggest an agent that is already in completedAgents — they cannot run again.
6. ALWAYS check remainingAgents — only pick from that list.
7. If remainingAgents is empty, respond with END.
8. If a critical agent failed twice, skip it and continue with the next remaining agent.
9. If discovery found 0 pages, skip performance_agent and go straight to scoring_agent.

You will receive the current pipeline state as JSON containing:
- completedAgents: agents that have already run — DO NOT suggest these
- remainingAgents: agents still to run — ONLY pick from these
- failedAgents: agents that failed and their attempt count
- pagesDiscovered: number of pages found by discovery
- findingsCount: total findings so far
- currentScore: current overall score
- error: any error from the last agent

Respond ONLY with valid JSON in this exact shape:
{
  "next": "agent_name or END",
  "reason": "one sentence explaining your decision",
  "focus": "optional specific instruction for the agent"
}
`.trim();

// ─── State Context Builder ────────────────────────────────────────────────────

const buildStateContext = (
  state: OrionState,
  completedAgents: AgentName[],
  failedAgents: { agent: AgentName; attempts: number }[]
): string => {
  const remainingAgents = AGENT_ORDER.filter(
    (a) => !completedAgents.includes(a)
  );

  return JSON.stringify({
    url: state.url,
    completedAgents,
    remainingAgents,
    failedAgents,
    pagesDiscovered: state.sitemap.length,
    findingsCount: state.findings.length,
    findingsBySeverity: {
      critical: state.findings.filter((f) => f.severity === "critical").length,
      high:     state.findings.filter((f) => f.severity === "high").length,
      medium:   state.findings.filter((f) => f.severity === "medium").length,
      low:      state.findings.filter((f) => f.severity === "low").length,
    },
    currentScore: state.overallScore,
    error: state.error ?? null,
  });
};

// ─── Orchestrator Loop ────────────────────────────────────────────────────────

export const runOrchestrated = async (
  initialState: OrionState,
  agents: Record<AgentName, AgentFn>
): Promise<OrionState> => {
  let state = initialState;
  let steps = 0;

  const completedAgents: AgentName[] = [];
  const failedAgents: { agent: AgentName; attempts: number }[] = [];

  console.log(`\n[orchestrator] starting run ${state.runId} → ${state.url}`);

  while (steps < MAX_STEPS) {
    steps++;

    // ── Check if all agents are done ─────────────────────────────────────
    const remainingAgents = AGENT_ORDER.filter(
      (a) => !completedAgents.includes(a)
    );

    if (remainingAgents.length === 0) {
      console.log(`[orchestrator] all agents complete — ending pipeline`);
      break;
    }

    // ── Ask orchestrator what to do next ─────────────────────────────────
    const stateContext = buildStateContext(state, completedAgents, failedAgents);
    console.log(`\n[orchestrator] step ${steps} — asking LLM for next action...`);

    let decision: OrchestratorDecision | null = await askJSON<OrchestratorDecision>(
      SYSTEM_PROMPT,
      `Current pipeline state:\n${stateContext}`
    );

    // ── Fallback if LLM fails or returns bad JSON ─────────────────────────
    if (!decision) {
      console.error("[orchestrator] LLM returned invalid JSON — using fallback order");
      const next = remainingAgents[0];
      if (!next) break;
      decision = {
        next,
        reason: "LLM fallback — running default order",
      };
    }

    console.log(`[orchestrator] decision: ${decision.next} | reason: ${decision.reason}`);
    if (decision.focus) {
      console.log(`[orchestrator] focus: ${decision.focus}`);
    }

    // ── Pipeline complete ─────────────────────────────────────────────────
    if (decision.next === "END") {
      console.log(`[orchestrator] LLM signalled END — pipeline complete`);
      break;
    }

    // ── agentName declared HERE — all logger calls using it must be below ─
    const agentName = decision.next as AgentName;
    const agentFn = agents[agentName];

    // ── Hard guard — unknown agent ────────────────────────────────────────
    if (!agentFn) {
      console.error(`[orchestrator] unknown agent '${agentName}' — skipping`);
      continue;
    }

    // ── Hard guard — never re-run a completed agent ───────────────────────
    if (completedAgents.includes(agentName)) {
      console.warn(
        `[orchestrator] '${agentName}' already completed — LLM tried to re-run it, skipping`
      );
      continue;
    }

    // ── Check retry limit ─────────────────────────────────────────────────
    const failRecord = failedAgents.find((f) => f.agent === agentName);
    if (failRecord && failRecord.attempts >= MAX_AGENT_RETRIES) {
      console.warn(
        `[orchestrator] '${agentName}' failed ${failRecord.attempts} times — marking done and skipping`
      );
      completedAgents.push(agentName);
      continue;
    }

    // ── Run the agent ─────────────────────────────────────────────────────
    try {
      logger.agentStarted(state.runId, agentName);
      await updateRunNode(state.runUUID, agentName, "running");

      state = await agentFn(state, decision.focus);
      completedAgents.push(agentName);

      logger.agentCompleted(state.runId, agentName);
      console.log(
        `[orchestrator] ✓ ${agentName} complete | findings so far: ${state.findings.length}`
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.info(state.runId, agentName, `agent failed: ${errorMsg}`);
      console.error(`[orchestrator] ✗ ${agentName} failed:`, errorMsg);

      if (failRecord) {
        failRecord.attempts++;
      } else {
        failedAgents.push({ agent: agentName, attempts: 1 });
      }

      state = { ...state, error: `${agentName} failed: ${errorMsg}` };
    }
  }

  // ── Safety net ────────────────────────────────────────────────────────────
  if (steps >= MAX_STEPS) {
    console.warn(`[orchestrator] hit max steps (${MAX_STEPS}) — forcing completion`);
    await failRun(state.runUUID, "Orchestrator hit max steps limit");
  }

  console.log(
    `[orchestrator] run ${state.runId} finished — score: ${state.overallScore} | passed: ${state.passed}`
  );

  return state;
};