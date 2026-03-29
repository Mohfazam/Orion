export type RunMode = "manual" | "ci";

export interface Finding {
  agent: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: "high" | "medium" | "low";
  title: string;
  detail: string;
  file?: string;
  line?: number;
  fixSuggestion?: string;
}

export interface PageNode {
  url: string;
  depth: number;
  status: number;
}

export interface OrionState {
  runId: string;
  runUUID: string;
  url: string;
  mode: RunMode;
  sitemap: PageNode[];
  findings: Finding[];
  overallScore: number;
  passed: boolean;
  currentNode: string;
  rootCause?: string;
  error?: string;
}

export type AgentName =
  | "discovery_agent"
  | "performance_agent"
  | "code_review_agent"
  | "scoring_agent"
  | "fix_agent"
  | "visualization_agent";