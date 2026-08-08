import api from './api';
import type { Roadmap, RoadmapPhase } from '../types';

export const roadmapService = {
  async generateRoadmap(careerName: string): Promise<Roadmap> {
    const response = await api.post('/roadmaps/generate', { careerName });
    return response.data.data;
  },

  async getMyRoadmap(): Promise<Roadmap | null> {
    const response = await api.get('/roadmaps/my');
    return response.data.data;
  },

  async getUserRoadmaps(): Promise<any[]> {
    const response = await api.get('/roadmaps/all');
    return response.data.data;
  },

  async getRoadmapById(id: string): Promise<Roadmap> {
    const response = await api.get(`/roadmaps/${id}`);
    return response.data.data;
  },

  async togglePhaseProgress(phaseId: string, completed: boolean): Promise<any> {
    const response = await api.patch(`/roadmaps/phase/${phaseId}/progress`, { completed });
    return response.data.data;
  },

  async getPhaseById(phaseId: string): Promise<RoadmapPhase> {
    const response = await api.get(`/roadmaps/phase/${phaseId}`);
    return response.data.data;
  },
};
