import api from './api';
import type { WeeklyGoal } from '../types';

export const weeklyGoalService = {
  async getWeeklyGoals(date?: string): Promise<WeeklyGoal[]> {
    const response = await api.get('/weekly-goals', {
      params: date ? { date } : {},
    });
    return response.data.data;
  },

  async createWeeklyGoal(title: string, date?: string): Promise<WeeklyGoal> {
    const response = await api.post('/weekly-goals', { title, date });
    return response.data.data;
  },

  async updateWeeklyGoal(id: string, updates: { completed?: boolean; title?: string }): Promise<WeeklyGoal> {
    const response = await api.patch(`/weekly-goals/${id}`, updates);
    return response.data.data;
  },

  async deleteWeeklyGoal(id: string): Promise<void> {
    await api.delete(`/weekly-goals/${id}`);
  },
};
