export type EventType =
  | "log"
  | "agent_started"
  | "agent_completed"
  | "score_updated";

export type EventStatus = "running" | "complete" | "failed";

export type AgentName =
  | "discovery"
  | "performance"
  | "scoring"
  | "visualization"
  | "system";

export interface LogMeta {
  url?: string;
  status?: number;
  issues?: number;
  score?: number;
  [key: string]: unknown;
}

export interface RealtimeEvent {
  type: EventType;
  runId: string;
  agent: AgentName | string;
  timestamp: string;
  message?: string;
  meta?: LogMeta;
  status?: EventStatus;
}