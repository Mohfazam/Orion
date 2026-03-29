import { useEffect, useState, useRef } from 'react';

export type SocketEvent = { type: string; [key: string]: any };

export const useRunSocket = (runId: string, enabled: boolean = true) => {
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const [connected, setConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!runId || !enabled) {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setConnected(false);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    let ws: WebSocket | null = null;
    let fallbackAttempted = false;

    const connectWS = (url: string) => {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws?.send(JSON.stringify({ type: 'subscribe', runId }));
        
        heartbeatRef.current = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          data.eventType = data.type || data.event;
          setEvents(prev => [...prev, data]);
        } catch (error) {
          console.error('Failed to parse WebSocket message', error);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      };

      ws.onerror = () => {
        if (!fallbackAttempted) {
          fallbackAttempted = true;
          ws?.close();
          console.warn("WebSocket primary path failed. Gracefully falling back to base generic path.");
          connectWS(baseUrl);
        }
      };
    };

    connectWS(`${baseUrl}/ws/runs/${runId}`);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [runId, enabled]);

  return { events, connected };
};
