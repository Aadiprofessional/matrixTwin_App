import client from './client';

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

// GET /projects/list — returns all projects visible to the authenticated user
export const getProjects = (): Promise<Project[]> =>
  client.get<Project[]>('/projects/list').then(r => r.data);

// GET /projects/:id
export const getProjectById = (id: string): Promise<Project> =>
  client.get<Project>(`/projects/${id}`).then(r => r.data);

// GET /projects/:id/members
export const getProjectMembers = (id: string) =>
  client.get(`/projects/${id}/members`).then(r => r.data);

export const createProject = (payload: Record<string, unknown>) =>
  client.post('/projects/create', payload).then(r => r.data);

export const updateProject = (id: string, payload: Record<string, unknown>) =>
  client.put(`/projects/${id}`, payload).then(r => r.data);

export const deleteProject = (id: string) =>
  client.delete(`/projects/${id}`).then(r => r.data);
