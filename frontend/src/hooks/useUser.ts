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
        localStorage.setItem('careerpath_user', JSON.stringify(updatedUser));
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

  const useSelectCareerMutation = (onNavigateToRoadmap?: () => void) => {
    return useMutation({
      mutationFn: (careerName: string) => userService.selectCareer(careerName),
      onSuccess: (data) => {
        // Immediately set the roadmap cache with the newly generated roadmap from the API response
        if (data && data.roadmap) {
          queryClient.setQueryData(['roadmap', 'latest'], data.roadmap);
        }

        // Invalidate every query that gets reset when a career is selected
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['roadmap'] });         // catches ['roadmap', 'latest'] and ['roadmap', id]
        queryClient.invalidateQueries({ queryKey: ['skill-gap'] });
        queryClient.invalidateQueries({ queryKey: ['skill-gap-history'] });
        queryClient.invalidateQueries({ queryKey: ['skill-progress'] });
        queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        
        // Navigate to roadmap tab after everything is reset
        onNavigateToRoadmap?.();
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
