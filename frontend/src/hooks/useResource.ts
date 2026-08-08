import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '../services/resource.service';
import type { Resource } from '../types';

export const useResource = () => {
  const queryClient = useQueryClient();

  const useResources = () => {
    return useQuery({
      queryKey: ['resources'],
      queryFn: resourceService.getResources,
    });
  };

  const useResourcesByPhase = (phaseId: string) => {
    return useQuery({
      queryKey: ['resources', 'phase', phaseId],
      queryFn: () => resourceService.getResourcesByPhase(phaseId),
      enabled: !!phaseId,
    });
  };

  const useCreateResourceMutation = () => {
    return useMutation({
      mutationFn: resourceService.createResource,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['resources'] });
      },
    });
  };

  const useUpdateResourceMutation = () => {
    return useMutation({
      mutationFn: (variables: { id: string; data: Partial<Resource> }) =>
        resourceService.updateResource(variables.id, variables.data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['resources'] });
      },
    });
  };

  const useDeleteResourceMutation = () => {
    return useMutation({
      mutationFn: resourceService.deleteResource,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['resources'] });
      },
    });
  };

  return {
    useResources,
    useResourcesByPhase,
    useCreateResourceMutation,
    useUpdateResourceMutation,
    useDeleteResourceMutation,
  };
};
