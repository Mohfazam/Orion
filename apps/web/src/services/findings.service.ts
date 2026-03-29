import api from '../lib/axios';
import { Finding, Severity, AgentType, PaginatedResponse } from '../types/orion';

export const findingsService = {
  getRunFindings: (runId: string, params?: { limit?: number; page?: number; severity?: string }): Promise<PaginatedResponse<Finding>> => {
    return api.get(`/runs/${runId}/findings`, { params });
  },
  
  getFindingById: (findingId: string): Promise<Finding> => {
    return api.get(`/findings/${findingId}`);
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
