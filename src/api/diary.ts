import client from './client';

export interface DiaryEntry {
  id: string;
  form_number?: string;
  date: string;
  project_id?: string;
  author: string;
  weather: string;
  temperature: string;
  work_completed: string;
  incidents_reported: string;
  materials_delivered: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateDiaryPayload {
  date: string;
  project_id: string;
  weather: string;
  temperature: string;
  work_completed: string;
  incidents_reported: string;
  materials_delivered: string;
  notes: string;
}

// GET /diary/list/:userId?projectId=...
export const getDiaryEntries = (userId: string, projectId?: string): Promise<DiaryEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/diary/list/${userId}${params}`).then(r => r.data);
};

// POST /diary/create
export const createDiaryEntry = (payload: CreateDiaryPayload): Promise<DiaryEntry> =>
  client.post('/diary/create', payload).then(r => r.data);

// PUT /diary/:id/update
export const updateDiaryEntry = (id: string, payload: Partial<CreateDiaryPayload>): Promise<DiaryEntry> =>
  client.put(`/diary/${id}/update`, payload).then(r => r.data);

// DELETE /diary/:id
export const deleteDiaryEntry = (id: string): Promise<any> =>
  client.delete(`/diary/${id}`).then(r => r.data);
