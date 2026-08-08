import api from './api';
import type { UserProfile, CareerRecommendation } from '../types';

export const userService = {
  async getMe(): Promise<UserProfile> {
    const response = await api.get('/user/me');
    return response.data.data;
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await api.patch('/user/update-profile', profileData);
    return response.data.data;
  },

  async recommendCareer(): Promise<CareerRecommendation> {
    const response = await api.post('/user/recommend-career');
    return response.data.data;
  },

  async exploreCareers(skills: string[], experience: number): Promise<CareerRecommendation> {
    const response = await api.post('/user/explore-careers', { skills, experience });
    return response.data.data;
  },

  async selectCareer(careerName: string): Promise<any> {
    const response = await api.post('/user/select-career', { careerName });
    return response.data.data;
  },

  async getRecommendationHistory(): Promise<CareerRecommendation[]> {
    const response = await api.get('/user/recommendation-history');
    return response.data.data;
  },
};
