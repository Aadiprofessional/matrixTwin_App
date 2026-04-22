import client from './client';

export interface CleansingEntry {
  id: string;
  form_number?: string;
  date: string;
  project_id?: string;
  area: string;
  cleaning_type: string;
  performed_by: string;
  materials_used: string;
  notes: string;
  status: string;
  created_at: string;
}

export interface CreateCleansingPayload {
  date: string;
  project_id: string;
  area: string;
  cleaning_type: string;
  performed_by: string;
  materials_used: string;
  notes: string;
}

export const getCleansingEntries = (userId: string, projectId?: string): Promise<CleansingEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/cleansing/list/${userId}${params}`).then(r => r.data);
};

export const createCleansingEntry = (payload: CreateCleansingPayload): Promise<CleansingEntry> =>
  client.post('/cleansing/create', payload).then(r => r.data);

export const updateCleansingEntry = (id: string, payload: Partial<CreateCleansingPayload>): Promise<CleansingEntry> =>
  client.put(`/cleansing/${id}/update`, payload).then(r => r.data);

export const deleteCleansingEntry = (id: string): Promise<any> =>
  client.delete(`/cleansing/${id}`).then(r => r.data);
