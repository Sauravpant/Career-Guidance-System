import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { weeklyGoalService } from '../services/weekly-goal.service';

export const useWeeklyGoal = () => {
  const queryClient = useQueryClient();

  const useWeeklyGoals = (date?: string) => {
    return useQuery({
      queryKey: ['weekly-goals', date],
      queryFn: () => weeklyGoalService.getWeeklyGoals(date),
    });
  };

  const useCreateWeeklyGoalMutation = () => {
    return useMutation({
      mutationFn: (variables: { title: string; date?: string }) =>
        weeklyGoalService.createWeeklyGoal(variables.title, variables.date),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
    });
  };

  const useUpdateWeeklyGoalMutation = () => {
    return useMutation({
      mutationFn: (variables: { id: string; updates: { completed?: boolean; title?: string } }) =>
        weeklyGoalService.updateWeeklyGoal(variables.id, variables.updates),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
    });
  };

  const useDeleteWeeklyGoalMutation = () => {
    return useMutation({
      mutationFn: weeklyGoalService.deleteWeeklyGoal,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      },
    });
  };

  return {
    useWeeklyGoals,
    useCreateWeeklyGoalMutation,
    useUpdateWeeklyGoalMutation,
    useDeleteWeeklyGoalMutation,
  };
};
