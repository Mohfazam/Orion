import { useEffect, useState, useRef } from 'react';

type SocketEvent = { type: string; payload?: any };

export const useRunSocket = (runId: string) => {
  const [lastEvent, setLastEvent] = useState<SocketEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!runId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      // Immediately subscribe to the run
      ws.send(JSON.stringify({ type: 'subscribe', runId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      // Clean up the connection on unmount
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [runId]);

  return { lastEvent, isConnected };
};
