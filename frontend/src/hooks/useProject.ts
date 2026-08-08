import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/project.service';
import type { Project } from '../types';

export const useProject = () => {
  const queryClient = useQueryClient();

  const useProjects = () => {
    return useQuery({
      queryKey: ['projects'],
      queryFn: projectService.getProjects,
    });
  };

  const useProjectsByPhase = (phaseId: string) => {
    return useQuery({
      queryKey: ['projects', 'phase', phaseId],
      queryFn: () => projectService.getProjectsByPhase(phaseId),
      enabled: !!phaseId,
    });
  };

  const useCreateProjectMutation = () => {
    return useMutation({
      mutationFn: projectService.createProject,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      },
    });
  };

  const useUpdateProjectMutation = () => {
    return useMutation({
      mutationFn: (variables: { id: string; data: Partial<Project> }) =>
        projectService.updateProject(variables.id, variables.data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      },
    });
  };

  const useDeleteProjectMutation = () => {
    return useMutation({
      mutationFn: projectService.deleteProject,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      },
    });
  };

  return {
    useProjects,
    useProjectsByPhase,
    useCreateProjectMutation,
    useUpdateProjectMutation,
    useDeleteProjectMutation,
  };
};
