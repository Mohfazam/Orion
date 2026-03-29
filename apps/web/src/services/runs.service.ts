import api from '../lib/axios';
import { Run, RunStatus, RunDiff, PaginatedResponse } from '../types/orion';

export const runsService = {
  getRuns: (params?: { limit?: number; order?: 'asc' | 'desc'; status?: string; page?: number }): Promise<PaginatedResponse<Run>> => {
    return api.get('/runs', { params });
  },
  
  createRun: (data: { url: string; mode: string }): Promise<Run & { runId?: string }> => {
    return api.post('/runs', data);
  },
  
  getRunById: (runId: string): Promise<Run> => {
    return api.get(`/runs/${runId}`);
  },
  
  getRunStatus: (runId: string): Promise<{ status: RunStatus; progress?: number }> => {
    return api.get(`/runs/${runId}/status`);
  },
  
  cancelRun: (runId: string): Promise<void> => {
    return api.delete(`/runs/${runId}`);
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
