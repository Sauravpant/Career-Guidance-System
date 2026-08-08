import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roadmapService } from '../services/roadmap.service';

export const useRoadmap = () => {
  const queryClient = useQueryClient();

  const useMyRoadmap = () => {
    return useQuery({
      queryKey: ['roadmap', 'latest'],
      queryFn: roadmapService.getMyRoadmap,
    });
  };

  const useRoadmapDetails = (id: string) => {
    return useQuery({
      queryKey: ['roadmap', id],
      queryFn: () => roadmapService.getRoadmapById(id),
      enabled: !!id,
    });
  };

  const usePhaseDetails = (phaseId: string) => {
    return useQuery({
      queryKey: ['roadmap-phase', phaseId],
      queryFn: () => roadmapService.getPhaseById(phaseId),
      enabled: !!phaseId,
    });
  };

  const useGenerateRoadmapMutation = () => {
    return useMutation({
      mutationFn: roadmapService.generateRoadmap,
      onSuccess: (newRoadmap) => {
        // Set query cache directly
        queryClient.setQueryData(['roadmap', 'latest'], newRoadmap);
        queryClient.invalidateQueries({ queryKey: ['roadmap'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });
      },
    });
  };

  const useTogglePhaseProgressMutation = () => {
    return useMutation({
      mutationFn: (variables: { phaseId: string; completed: boolean }) =>
        roadmapService.togglePhaseProgress(variables.phaseId, variables.completed),
      onSuccess: (_, variables) => {
        // Invalidate specific phase, entire roadmap and dashboard KPIs
        queryClient.invalidateQueries({ queryKey: ['roadmap'] });
        queryClient.invalidateQueries({ queryKey: ['roadmap-phase', variables.phaseId] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
    });
  };

  return {
    useMyRoadmap,
    useRoadmapDetails,
    usePhaseDetails,
    useGenerateRoadmapMutation,
    useTogglePhaseProgressMutation,
  };
};
