import client from './client';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  phone?: string;
}

export const getProjectMembers = (projectId: string): Promise<TeamMember[]> =>
  client.get(`/projects/${projectId}/members`).then(r => r.data);

export const assignProjectMember = (projectId: string, userIds: string[]): Promise<any> =>
  client.post(`/projects/${projectId}/members`, { userIds }).then(r => r.data);

export const removeProjectMember = (projectId: string, userId: string): Promise<any> =>
  client.delete(`/projects/${projectId}/members/${userId}`).then(r => r.data);
