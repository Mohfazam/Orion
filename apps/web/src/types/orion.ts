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
  completedAt?: string;
  durationMs?: number;
  findings?: number;
  agentResults?: AgentInfo[];
  prevRunId?: string;
  mode?: 'manual' | 'ci' | 'api';
  summary?: {
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
  };
}

export interface Finding {
  id: string;
  runId: string;
  agent: AgentType;
  agentType?: AgentType;
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
  agent: AgentType;
  type?: AgentType;
  name?: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  durationMs?: number;
  score?: number;
}

export interface RunDiff {
  currentRunId: string;
  previousRunId: string;
  scoreDelta: number;
  newFindings: Finding[];
  resolvedFindings: Finding[];
  newCount: number;
  resolvedCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasNext: boolean;
  hasPrev: boolean;
  page: number;
  limit?: number;
  total?: number;
}

export interface Repo {
  id: string;
  owner: string;
  repo: string;
  installationId: string;
  stagingUrl: string;
  createdAt: string;
  lastRun: {
    runId: string;
    status: RunStatus;
    overallScore: number | null;
    passed: boolean | null;
    createdAt: string;
  } | null;
  runs?: Run[];
}
