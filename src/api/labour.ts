import client from './client';

export interface LabourEntry {
  id: string;
  form_number?: string;
  date: string;
  project_id?: string;
  supervisor: string;
  trade: string;
  workers_count: number;
  hours_worked: number;
  tasks_completed: string;
  notes: string;
  status: string;
  created_at: string;
}

export interface CreateLabourPayload {
  date: string;
  project_id: string;
  supervisor: string;
  trade: string;
  workers_count: number;
  hours_worked: number;
  tasks_completed: string;
  notes: string;
}

export const getLabourEntries = (userId: string, projectId?: string): Promise<LabourEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/labour/list/${userId}${params}`).then(r => r.data);
};

export const createLabourEntry = (payload: CreateLabourPayload): Promise<LabourEntry> =>
  client.post('/labour/create', payload).then(r => r.data);

export const updateLabourEntry = (id: string, payload: Partial<CreateLabourPayload>): Promise<LabourEntry> =>
  client.put(`/labour/${id}/update`, payload).then(r => r.data);

export const deleteLabourEntry = (id: string): Promise<any> =>
  client.delete(`/labour/${id}`).then(r => r.data);
