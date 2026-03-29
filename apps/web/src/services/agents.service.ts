import api from '../lib/axios';
import { AgentInfo, AgentType } from '../types/orion';

export const agentsService = {
  getRunAgents: (runId: string): Promise<AgentInfo[]> => {
    return api.get(`/runs/${runId}/agents`);
  },
  
  getAgentByType: (runId: string, type: AgentType): Promise<AgentInfo> => {
    return api.get(`/runs/${runId}/agents/${type}`);
  },
  
  getRunGraph: (runId: string): Promise<any> => {
    return api.get(`/runs/${runId}/graph`);
  }
};
