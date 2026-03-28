export type EventType =
  | "log"
  | "agent_started"
  | "agent_completed"
  | "score_updated";

export type EventStatus = "running" | "complete" | "failed";

export interface RealtimeEvent {
  type: EventType;
  runId: string;
  agent: string;
  timestamp: string;
  message?: string;
  status?: EventStatus;
  score?: number;
}