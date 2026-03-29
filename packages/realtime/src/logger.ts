import { WebSocket } from "ws";
import { clients, broadcast } from "./socket";
import { RealtimeEvent, AgentName, LogMeta } from "./types";

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function serialize(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try { return JSON.stringify(arg); }
      catch { return String(arg); }
    })
    .join(" ");
}

function emit(event: RealtimeEvent): void {
  if (clients.size === 0) return;
  broadcast(event);
}

function makeEvent(
  type: RealtimeEvent["type"],
  runId: string,
  agent: AgentName | string,
  overrides: Partial<RealtimeEvent> = {}
): RealtimeEvent {
  return {
    type,
    runId,
    agent,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Structured Logger ────────────────────────────────────────────────────────

export const logger = {
  info(runId: string, agent: AgentName | string, message: string, meta?: LogMeta): void {
    console.log(`[${agent}] ${message}`, meta ?? "");
    emit(makeEvent("log", runId, agent, { message, meta }));
  },

  agentStarted(runId: string, agent: AgentName | string): void {
    console.log(`[${agent}] started`);
    emit(makeEvent("agent_started", runId, agent, { status: "running" }));
  },

  agentCompleted(runId: string, agent: AgentName | string): void {
    console.log(`[${agent}] completed`);
    emit(makeEvent("agent_completed", runId, agent, { status: "complete" }));
  },

  scoreUpdated(runId: string, score: number): void {
    console.log(`[scoring] score updated → ${score}`);
    emit(makeEvent("score_updated", runId, "scoring", { meta: { score } }));
  },
};

// ─── console.log Fallback (backward compat) ───────────────────────────────────

export function initLogger(): void {
  const originalLog = console.log.bind(console);

  console.log = (...args: unknown[]): void => {
    originalLog(...args);

    if (clients.size === 0) return;

    const event: RealtimeEvent = {
      type: "log",
      runId: "global",
      agent: "system",
      message: serialize(args),
      timestamp: new Date().toISOString(),
    };

    const data = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  };
}