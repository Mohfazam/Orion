import { Repo } from '../types/orion';
import api from '../lib/axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export const CONNECT_REPO_URL = `${API_BASE}/repos/connect`;

export const reposService = {
  getRepos: (): Promise<Repo[]> => {
    return api.get('/repos');
  },

  getRepoById: (repoId: string): Promise<Repo> => {
    return api.get(`/repos/${repoId}`);
  },

  updateStagingUrl: (repoId: string, stagingUrl: string): Promise<Repo> => {
    return api.patch(`/repos/${repoId}`, { stagingUrl });
  },

  deleteRepo: (repoId: string): Promise<void> => {
    return api.delete(`/repos/${repoId}`);
  }
};
