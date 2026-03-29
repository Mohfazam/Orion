import api from '../lib/axios';
import { Run, RunStatus, RunDiff } from '../types/orion';

export const runsService = {
  getRuns: (): Promise<Run[]> => {
    return api.get('/runs');
  },
  
  createRun: (url: string): Promise<Run> => {
    return api.post('/runs', { url });
  },
  
  getRunById: (runId: string): Promise<Run> => {
    return api.get(`/runs/${runId}`);
  },
  
  getRunStatus: (runId: string): Promise<{ status: RunStatus; progress?: number }> => {
    return api.get(`/runs/${runId}/status`);
  },
  
  cancelRun: (runId: string): Promise<void> => {
    return api.post(`/runs/${runId}/cancel`);
  },
  
  getActiveRuns: (): Promise<Run[]> => {
    return api.get('/runs/active');
  },
  
  getRunDiff: (currentRunId: string, previousRunId: string): Promise<RunDiff> => {
    return api.get(`/runs/${currentRunId}/diff`, {
      params: { previous: previousRunId }
    });
  }
};
