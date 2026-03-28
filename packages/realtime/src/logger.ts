import { WebSocket } from "ws";
import { clients } from "./socket";

interface LogPayload {
  type: "log";
  message: string;
  timestamp: string;
}

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

function broadcast(message: string): void {
  if (clients.size === 0) return;

  const payload: LogPayload = {
    type: "log",
    message,
    timestamp: new Date().toISOString(),
  };

  const data = JSON.stringify(payload);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function initLogger(): void {
  const originalLog = console.log.bind(console);

  console.log = (...args: unknown[]): void => {
    originalLog(...args);
    broadcast(serialize(args));
  };
}