import api from '../lib/axios';
import { Finding, Severity, AgentType } from '../types/orion';

export const findingsService = {
  getRunFindings: (runId: string): Promise<Finding[]> => {
    return api.get(`/runs/${runId}/findings`);
  },
  
  getFindingsByAgent: (runId: string, agentType: AgentType): Promise<Finding[]> => {
    return api.get(`/runs/${runId}/findings`, {
      params: { agent: agentType }
    });
  },
  
  getFindingsBySeverity: (runId: string, severity: Severity): Promise<Finding[]> => {
    return api.get(`/runs/${runId}/findings`, {
      params: { severity }
    });
  }
};
