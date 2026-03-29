import { AgentType, Severity } from '../types/orion';

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'text-red-600 bg-red-100',
  high: 'text-orange-600 bg-orange-100',
  medium: 'text-yellow-600 bg-yellow-100',
  low: 'text-blue-600 bg-blue-100',
  info: 'text-gray-600 bg-gray-100',
};

export const AGENT_LIST: AgentType[] = [
  'discovery',
  'performance',
  'scoring',
  'visualization',
];

export const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

export const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Needs Improvement';
  return 'Poor';
};