import { useQuery } from '@tanstack/react-query';
import { getProjects, getProjectById } from '../api/projects';

export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProjectById(id),
    enabled: !!id,
  });
};
