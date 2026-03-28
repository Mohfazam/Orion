import { WebSocketServer, WebSocket } from "ws";

export const clients: Set<WebSocket> = new Set();

export function initSocket(port: number = 4001): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on("listening", () => {
    console.log(`[realtime] WebSocket server listening on ws://localhost:${port}`);
  });

  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (err: Error) => {
      console.error("[realtime] WebSocket client error:", err.message);
      clients.delete(ws);
    });
  });

  wss.on("error", (err: Error) => {
    console.error("[realtime] WebSocket server error:", err.message);
  });

  return wss;
}