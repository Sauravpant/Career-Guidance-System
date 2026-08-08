import api from './api';
import type { DashboardResponse } from '../types';

export const dashboardService = {
  async getDashboardData(): Promise<DashboardResponse> {
    const response = await api.get('/dashboard');
    return response.data.data;
  },

  async getWeeklyProgressTrack(): Promise<any> {
    const response = await api.get('/dashboard/weekly-progress');
    return response.data.data;
  },

  async getPhaseProgressTrack(): Promise<any> {
    const response = await api.get('/dashboard/phase-progress');
    return response.data.data;
  },
};
