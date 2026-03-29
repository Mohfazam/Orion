export type RunStatus = 'queued' | 'running' | 'complete' | 'failed';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AgentType = 'discovery' | 'performance' | 'scoring' | 'visualization';

// Generic standard API response wrapper based on expected shape
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface Run {
  id: string;
  runId: string;
  url: string;
  status: RunStatus;
  overallScore?: number;
  passed?: boolean;
  createdAt: string;
  updatedAt: string;
  durationMs?: number;
  findings?: number;
  prevRunId?: string;
}

export interface Finding {
  id: string;
  runId: string;
  agentType: AgentType;
  severity: Severity;
  createdAt: string;
  title: string;
  detail: string;
  file: string;
  confidence: number;
  fixSuggestion: string;
}

export interface AgentInfo {
  id: string;
  type: AgentType;
  name: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  durationMs?: number;
  score?: number;
}

export interface RunDiff {
  previousRunId: string;
  currentRunId: string;
  scoreDifference: number;
  scoreDelta: number;
  verdict: 'regression' | 'improvement' | 'unchanged';
  newFindingsCount: number;
  resolvedFindingsCount: number;
  unchangedFindingsCount: number;
  newFindings: Finding[];
  resolvedFindings: Finding[];
}

export interface PaginatedResponse<T> {
  data: T[];
  hasNext: boolean;
  hasPrev: boolean;
  page: number;
  limit?: number;
  total?: number;
}
