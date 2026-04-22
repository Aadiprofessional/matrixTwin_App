import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  location?: string;
  client?: string;
  deadline?: string;
  description?: string;
  status: string;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (project: Project | null) => void;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectState>(set => ({
  projects: [],
  selectedProject: null,
  setProjects: (projects: Project[]) => set({ projects }),
  setSelectedProject: (project: Project | null) =>
    set({ selectedProject: project }),
  clearProjects: () => set({ projects: [], selectedProject: null }),
}));

