import { OrionState, AgentName } from "./types";
import { askJSON } from "./llm";
import { failRun, updateRunNode } from "./db";
import { logger } from "@repo/realtime";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentFn = (state: OrionState, focus?: string) => Promise<OrionState>;

interface OrchestratorDecision {
  next: AgentName | "END";
  reason: string;
  focus?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_STEPS        = 12;
const MAX_AGENT_RETRIES = 2;
const PASS_THRESHOLD   = 99; // must match scoring.ts and fix.ts

const AGENT_ORDER: AgentName[] = [
  "discovery_agent",
  "performance_agent",
  "code_review_agent",
  "scoring_agent",
  "fix_agent",
  "visualization_agent",
];

// ─── Orchestrator Prompt ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are the QA Orchestrator for Orion — an autonomous web quality testing platform.
You manage 6 specialist agents and decide which one runs next based on the current pipeline state.

AGENTS:
- discovery_agent      → Crawls the website using a real browser. Maps all pages, finds broken links. MUST always run first.
- performance_agent    → Runs Lighthouse on discovered pages. Measures Core Web Vitals. Requires discovery_agent first.
- code_review_agent    → Reviews source files from GitHub for security, bugs, accessibility. ONLY in CI mode. MUST run after performance_agent.
- scoring_agent        → Applies weighted scoring to all findings. Produces 0-100 score. Run after all testing agents.
- fix_agent            → Generates and commits AI fixes. ONLY in CI mode. Runs after scoring_agent. The orchestrator code will handle whether to skip it — you do NOT need to decide this.
- visualization_agent  → Saves final results to DB. MUST always run last. NEVER skip this.

RULES:
1. discovery_agent MUST always run first.
2. performance_agent runs after discovery_agent.
3. code_review_agent runs after performance_agent — ONLY if mode is "ci".
4. scoring_agent runs after all testing agents complete.
5. After scoring_agent: suggest fix_agent if it is in remainingAgents.
6. visualization_agent MUST always run last — never skip it, never signal END before it runs.
7. NEVER suggest an agent already in completedAgents.
8. ONLY pick from remainingAgents.
9. Do NOT signal END until visualization_agent has completed.
10. If a critical agent failed twice, skip it and move to the next in remainingAgents.

Respond ONLY with valid JSON:
{
  "next": "agent_name or END",
  "reason": "one sentence explaining your decision",
  "focus": "optional instruction for the agent"
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
    url:             state.url,
    mode:            state.mode,
    completedAgents,
    remainingAgents,
    failedAgents,
    pagesDiscovered: state.sitemap.length,
    findingsCount:   state.findings.length,
    findingsBySeverity: {
      critical: state.findings.filter((f) => f.severity === "critical").length,
      high:     state.findings.filter((f) => f.severity === "high").length,
      medium:   state.findings.filter((f) => f.severity === "medium").length,
      low:      state.findings.filter((f) => f.severity === "low").length,
    },
    currentScore: state.overallScore,
    passed:       state.passed,
    error:        state.error ?? null,
  });
};

// ─── Hard-coded next agent logic ──────────────────────────────────────────────
// These rules override the LLM to prevent it from skipping critical agents.

const getHardCodedNext = (
  state: OrionState,
  completedAgents: AgentName[]
): AgentName | null => {
  const done = (a: AgentName) => completedAgents.includes(a);

  // visualization_agent must always run last — force it if everything else is done
  if (
    done("scoring_agent") &&
    (done("fix_agent") || state.mode !== "ci" || state.overallScore >= PASS_THRESHOLD) &&
    !done("visualization_agent")
  ) {
    return "visualization_agent";
  }

  // fix_agent must run if: CI mode, score below threshold, scoring done, not yet run
  if (
    state.mode === "ci" &&
    state.overallScore < PASS_THRESHOLD &&
    done("scoring_agent") &&
    !done("fix_agent")
  ) {
    return "fix_agent";
  }

  return null; // let LLM decide
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

    const remainingAgents = AGENT_ORDER.filter(
      (a) => !completedAgents.includes(a)
    );

    if (remainingAgents.length === 0) {
      console.log(`[orchestrator] all agents complete — ending pipeline`);
      break;
    }

    // ── Hard-coded override first ─────────────────────────────────────────
    const forcedNext = getHardCodedNext(state, completedAgents);

    let agentName: AgentName;

    if (forcedNext) {
      console.log(`\n[orchestrator] step ${steps} — hard-coded rule forcing: ${forcedNext}`);
      agentName = forcedNext;
    } else {
      // ── Ask LLM what to do next ─────────────────────────────────────────
      const stateContext = buildStateContext(state, completedAgents, failedAgents);
      console.log(`\n[orchestrator] step ${steps} — asking LLM for next action...`);

      let decision: OrchestratorDecision | null = await askJSON<OrchestratorDecision>(
        SYSTEM_PROMPT,
        `Current pipeline state:\n${stateContext}`
      );

      // Fallback if LLM fails
      if (!decision) {
        console.error("[orchestrator] LLM returned invalid JSON — using fallback order");
        const next = remainingAgents[0];
        if (!next) break;
        decision = { next, reason: "LLM fallback — running default order" };
      }

      console.log(`[orchestrator] decision: ${decision.next} | reason: ${decision.reason}`);
      if (decision.focus) {
        console.log(`[orchestrator] focus: ${decision.focus}`);
      }

      // ── LLM signalled END — but only honour it if viz_agent is done ──────
      if (decision.next === "END") {
        if (!completedAgents.includes("visualization_agent")) {
          console.warn(
            `[orchestrator] LLM signalled END but visualization_agent hasn't run — forcing it`
          );
          agentName = "visualization_agent";
        } else {
          console.log(`[orchestrator] LLM signalled END — pipeline complete`);
          break;
        }
      } else {
        agentName = decision.next as AgentName;
      }
    }

    const agentFn = agents[agentName];

    // ── Hard guard — unknown agent ────────────────────────────────────────
    if (!agentFn) {
      console.error(`[orchestrator] unknown agent '${agentName}' — skipping`);
      completedAgents.push(agentName);
      continue;
    }

    // ── Hard guard — never re-run a completed agent ───────────────────────
    if (completedAgents.includes(agentName)) {
      console.warn(
        `[orchestrator] '${agentName}' already completed — skipping`
      );
      continue;
    }

    // ── Check retry limit ─────────────────────────────────────────────────
    const failRecord = failedAgents.find((f) => f.agent === agentName);
    if (failRecord && failRecord.attempts >= MAX_AGENT_RETRIES) {
      console.warn(
        `[orchestrator] '${agentName}' failed ${failRecord.attempts} times — skipping`
      );
      completedAgents.push(agentName);
      continue;
    }

    // ── Run the agent ─────────────────────────────────────────────────────
    try {
      logger.agentStarted(state.runId, agentName);
      await updateRunNode(state.runUUID, agentName, "running");

      state = await agentFn(state, forcedNext ? undefined : undefined);
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