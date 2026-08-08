import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import type { UserProfile } from '../types';

export const useUser = () => {
  const queryClient = useQueryClient();

  // Query for career recommendation history
  const useRecommendationHistory = () => {
    return useQuery({
      queryKey: ['recommendation-history'],
      queryFn: userService.getRecommendationHistory,
    });
  };

  // Mutation for updating profile
  const useUpdateProfileMutation = () => {
    return useMutation({
      mutationFn: userService.updateProfile,
      onSuccess: (updatedUser) => {
        // Update user profile in queries
        queryClient.setQueryData(['me'], updatedUser);
        localStorage.setItem('pathfinder_user', JSON.stringify(updatedUser));
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
    });
  };

  // Mutation for generating new career recommendations for logged in user
  const useRecommendCareerMutation = () => {
    return useMutation({
      mutationFn: () => userService.recommendCareer(),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['recommendation-history'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    });
  };

  const useExploreCareersMutation = () => {
    return useMutation({
      mutationFn: (payload: { skills: string[]; experience: number }) =>
        userService.exploreCareers(payload.skills, payload.experience),
    });
  };

  const useSelectCareerMutation = () => {
    return useMutation({
      mutationFn: (careerName: string) => userService.selectCareer(careerName),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['roadmap'] });
        queryClient.invalidateQueries({ queryKey: ['skill-gap'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
      },
    });
  };

  return {
    useRecommendationHistory,
    useUpdateProfileMutation,
    useRecommendCareerMutation,
    useExploreCareersMutation,
    useSelectCareerMutation,
  };
};
