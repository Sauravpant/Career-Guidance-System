import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const useDashboard = () => {
  const useDashboardData = () => {
    return useQuery({
      queryKey: ['dashboard', 'main'],
      queryFn: dashboardService.getDashboardData,
      staleTime: 60 * 1000, // 1 minute
    });
  };

  const useWeeklyProgressTrack = () => {
    return useQuery({
      queryKey: ['dashboard', 'weekly-progress'],
      queryFn: dashboardService.getWeeklyProgressTrack,
    });
  };

  const usePhaseProgressTrack = () => {
    return useQuery({
      queryKey: ['dashboard', 'phase-progress'],
      queryFn: dashboardService.getPhaseProgressTrack,
    });
  };

  return {
    useDashboardData,
    useWeeklyProgressTrack,
    usePhaseProgressTrack,
  };
};
