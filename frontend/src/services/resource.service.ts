import api from './api';
import type { Resource } from '../types';

export const resourceService = {
  async getResources(): Promise<Resource[]> {
    const response = await api.get('/resources');
    return response.data.data;
  },

  async getResourcesByPhase(phaseId: string): Promise<Resource[]> {
    const response = await api.get(`/resources/phase/${phaseId}`);
    return response.data.data;
  },

  async createResource(resourceData: Omit<Resource, 'id' | 'userId' | 'createdAt'>): Promise<Resource> {
    const response = await api.post('/resources', resourceData);
    return response.data.data;
  },

  async updateResource(id: string, resourceData: Partial<Resource>): Promise<Resource> {
    const response = await api.patch(`/resources/${id}`, resourceData);
    return response.data.data;
  },

  async deleteResource(id: string): Promise<void> {
    await api.delete(`/resources/${id}`);
  },
};
