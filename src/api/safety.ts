import client from './client';

export interface SafetyEntry {
  id: string;
  form_number?: string;
  date: string;
  project_id?: string;
  inspector: string;
  location: string;
  inspection_type: string;
  findings: string;
  corrective_actions: string;
  risk_level: string;
  status: string;
  created_at: string;
}

export interface CreateSafetyPayload {
  date: string;
  project_id: string;
  inspector: string;
  location: string;
  inspection_type: string;
  findings: string;
  corrective_actions: string;
  risk_level: string;
}

export const getSafetyEntries = (userId: string, projectId?: string): Promise<SafetyEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/safety/list/${userId}${params}`).then(r => r.data);
};

export const createSafetyEntry = (payload: CreateSafetyPayload): Promise<SafetyEntry> =>
  client.post('/safety/create', payload).then(r => r.data);

export const updateSafetyEntry = (id: string, payload: Partial<CreateSafetyPayload>): Promise<SafetyEntry> =>
  client.put(`/safety/${id}/update`, payload).then(r => r.data);

export const deleteSafetyEntry = (id: string): Promise<any> =>
  client.delete(`/safety/${id}`).then(r => r.data);
