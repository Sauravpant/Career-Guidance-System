import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { skillGapService } from '../services/skill-gap.service';

export const useSkillGap = () => {
  const queryClient = useQueryClient();

  const useAvailableCareers = () => {
    return useQuery({
      queryKey: ['skill-gap-careers'],
      queryFn: skillGapService.getAvailableCareers,
      staleTime: Infinity, // static data — never re-fetch automatically
    });
  };

  const useSkillGapProgress = () => {
    return useQuery({
      queryKey: ['skills-progress'],
      queryFn: skillGapService.getSkillProgress,
    });
  };

  const useSkillGapHistory = () => {
    return useQuery({
      queryKey: ['skills-gap-history'],
      queryFn: skillGapService.getHistory,
    });
  };

  const useRunAnalysisMutation = () => {
    return useMutation({
      mutationFn: skillGapService.runAnalysis,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['skills-gap-history'] });
        queryClient.invalidateQueries({ queryKey: ['skills-progress'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    });
  };

  const useUpsertSkillProgressMutation = () => {
    return useMutation({
      mutationFn: (variables: {
        skillName: string;
        status: 'LEARNING' | 'COMPLETED' | 'WANT_TO_LEARN';
        score?: number;
      }) =>
        skillGapService.upsertSkillProgress(
          variables.skillName,
          variables.status,
          variables.score
        ),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['skills-progress'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    });
  };

  return {
    useAvailableCareers,
    useSkillGapProgress,
    useSkillGapHistory,
    useRunAnalysisMutation,
    useUpsertSkillProgressMutation,
  };
};
