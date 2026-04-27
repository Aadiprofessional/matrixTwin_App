import client from './client';

export interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  project_role?: string;
  avatar?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'pending';
  joined_at?: string;
}

export interface ProjectMember {
  user_id: string;
  role: string;
  joined_at: string;
  user: TeamMember;
}

export interface AssignableMember {
  user: TeamMember;
  status: 'assigned_current' | 'assigned_other' | 'available';
  assigned_to_current: boolean;
  other_assignments?: Array<{ id: string; name: string }>;
}

export interface AssignableMembersResponse {
  project_id: string;
  project_name: string;
  members: AssignableMember[];
}

export interface RolePermissions {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface TeamMemberInvite {
  email: string;
  role: string;
  projectId?: string;
}

// GET /projects/:projectId/members
export const getProjectMembers = (projectId: string): Promise<ProjectMember[]> =>
  client.get(`/projects/${projectId}/members`).then(r => r.data);

// GET /projects/:projectId/assignable-members
export const getAssignableMembers = (projectId: string): Promise<AssignableMembersResponse> =>
  client.get(`/projects/${projectId}/assignable-members`).then(r => r.data);

// POST /projects/:projectId/members
export const assignProjectMembers = (projectId: string, userIds: string[], role?: string): Promise<any> =>
  client.post(`/projects/${projectId}/members`, { userIds, role }).then(r => r.data);

// POST /projects/:projectId/members/assign
export const assignProjectMember = (projectId: string, userId: string, role: string): Promise<any> =>
  client.post(`/projects/${projectId}/members/assign`, { userId, role }).then(r => r.data);

// PUT /projects/:projectId/members/:userId/role
export const updateMemberRole = (projectId: string, userId: string, role: string): Promise<any> =>
  client.put(`/projects/${projectId}/members/${userId}/role`, { role }).then(r => r.data);

// DELETE /projects/:projectId/members/:userId
export const removeProjectMember = (projectId: string, userId: string): Promise<any> =>
  client.delete(`/projects/${projectId}/members/${userId}`).then(r => r.data);

// GET /team/members
export const getTeamMembers = (): Promise<TeamMember[]> =>
  client.get('/team/members').then(r => r.data);

// POST /team/members/invite
export const inviteTeamMember = (payload: TeamMemberInvite): Promise<any> =>
  client.post('/team/members/invite', payload).then(r => r.data);

// GET /roles
export const getRoles = (): Promise<RolePermissions[]> =>
  client.get('/roles').then(r => r.data);

// GET /roles/:roleId
export const getRoleById = (roleId: string): Promise<RolePermissions> =>
  client.get(`/roles/${roleId}`).then(r => r.data);
