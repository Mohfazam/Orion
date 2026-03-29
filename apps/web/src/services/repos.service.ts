import { Repo } from '../types/orion';
import api from '../lib/axios';

export const CONNECT_REPO_URL = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/v1/repos/connect`;

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
