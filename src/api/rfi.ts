import client from './client';

export interface RfiEntry {
  id: string;
  form_number?: string;
  subject: string;
  description: string;
  project_id?: string;
  raised_by: string;
  assigned_to?: string;
  priority: string;
  status: string;
  response?: string;
  due_date?: string;
  created_at: string;
}

export interface CreateRfiPayload {
  subject: string;
  description: string;
  project_id: string;
  priority: string;
  due_date?: string;
}

export const getRfiEntries = (userId: string, projectId?: string): Promise<RfiEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/rfi/list/${userId}${params}`).then(r => r.data);
};

export const createRfiEntry = (payload: CreateRfiPayload): Promise<RfiEntry> =>
  client.post('/rfi/create', payload).then(r => r.data);

export const updateRfiEntry = (id: string, payload: Partial<CreateRfiPayload>): Promise<RfiEntry> =>
  client.put(`/rfi/${id}/update`, payload).then(r => r.data);

export const deleteRfiEntry = (id: string): Promise<any> =>
  client.delete(`/rfi/${id}`).then(r => r.data);
