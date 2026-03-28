import { clients, broadcast } from "./socket";
import { RealtimeEvent, EventType } from "./types";
import { WebSocket } from "ws";

function serialize(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

function emit(event: RealtimeEvent): void {
  if (clients.size === 0) return;
  broadcast(event);
}

function makeEvent(
  type: EventType,
  runId: string,
  agent: string,
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

export const logger = {
  info(runId: string, agent: string, ...args: unknown[]): void {
    const message = serialize(args);
    emit(makeEvent("log", runId, agent, { message }));
  },

  agentStarted(runId: string, agent: string): void {
    emit(makeEvent("agent_started", runId, agent, { status: "running" }));
  },

  agentCompleted(runId: string, agent: string): void {
    emit(makeEvent("agent_completed", runId, agent, { status: "complete" }));
  },

  scoreUpdated(runId: string, score: number): void {
    emit(makeEvent("score_updated", runId, "system", { score }));
  },
};

export function initLogger(): void {
  const originalLog = console.log.bind(console);

  console.log = (...args: unknown[]): void => {
    originalLog(...args);

    // Backward compatible global broadcast with no runId
    const event: RealtimeEvent = {
      type: "log",
      runId: "global",
      agent: "system",
      message: serialize(args),
      timestamp: new Date().toISOString(),
    };

    if (clients.size === 0) return;

    const data = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  };
}