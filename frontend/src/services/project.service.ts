import api from './api';
import type { Project } from '../types';

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const response = await api.get('/projects');
    return response.data.data;
  },

  async getProjectsByPhase(phaseId: string): Promise<Project[]> {
    const response = await api.get(`/projects/phase/${phaseId}`);
    return response.data.data;
  },

  async createProject(projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>): Promise<Project> {
    const response = await api.post('/projects', projectData);
    return response.data.data;
  },

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    const response = await api.patch(`/projects/${id}`, projectData);
    return response.data.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
