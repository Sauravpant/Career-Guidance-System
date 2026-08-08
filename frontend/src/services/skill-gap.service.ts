import api from './api';
import type { SkillGapHistory, SkillProgress } from '../types';

export const skillGapService = {
  async getAvailableCareers(): Promise<string[]> {
    const response = await api.get('/skill-gaps/careers');
    return response.data.data;
  },

  async runAnalysis(careerName: string): Promise<SkillGapHistory> {
    const response = await api.post('/skill-gaps/analyze', { careerName });
    return response.data.data;
  },

  async getHistory(): Promise<SkillGapHistory[]> {
    const response = await api.get('/skill-gaps/history');
    return response.data.data;
  },

  async getSkillProgress(): Promise<SkillProgress[]> {
    const response = await api.get('/skill-gaps/progress');
    return response.data.data;
  },

  async upsertSkillProgress(
    skillName: string,
    status: 'LEARNING' | 'COMPLETED' | 'WANT_TO_LEARN',
    score = 0.0
  ): Promise<SkillProgress> {
    const response = await api.post('/skill-gaps/progress', { skillName, status, score });
    return response.data.data;
  },
};
