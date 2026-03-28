import { WebSocketServer, WebSocket } from "ws";
import { RealtimeEvent } from "./types";

export const clients: Set<WebSocket> = new Set();

// runId → Set of subscribed clients
export const runSubscriptions: Map<string, Set<WebSocket>> = new Map();

function safeClose(ws: WebSocket): void {
  clients.delete(ws);

  for (const [runId, subs] of runSubscriptions.entries()) {
    subs.delete(ws);
    if (subs.size === 0) {
      runSubscriptions.delete(runId);
    }
  }
}

export function broadcast(event: RealtimeEvent): void {
  const data = JSON.stringify(event);
  const targets = runSubscriptions.get(event.runId);

  // If there are subscribers for this runId, send only to them
  // Otherwise fall back to global broadcast
  const recipients: Set<WebSocket> = targets && targets.size > 0 ? targets : clients;

  for (const client of recipients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

interface SubscribeMessage {
  type: "subscribe";
  runId: string;
}

function isSubscribeMessage(data: unknown): data is SubscribeMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>)["type"] === "subscribe" &&
    typeof (data as Record<string, unknown>)["runId"] === "string"
  );
}

export function initSocket(port: number = 4001): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on("listening", () => {
    console.log(`[realtime] WebSocket server listening on ws://localhost:${port}`);
  });

  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);

    ws.on("message", (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw.toString());

        if (isSubscribeMessage(parsed)) {
          const { runId } = parsed;
          if (!runSubscriptions.has(runId)) {
            runSubscriptions.set(runId, new Set());
          }
          runSubscriptions.get(runId)!.add(ws);
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => safeClose(ws));
    ws.on("error", (err: Error) => {
      console.error("[realtime] WebSocket client error:", err.message);
      safeClose(ws);
    });
  });

  wss.on("error", (err: Error) => {
    console.error("[realtime] WebSocket server error:", err.message);
  });

  return wss;
}