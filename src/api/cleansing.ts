import client from './client';

export interface CleansingEntry {
  id: string;
  form_number?: string;
  formNumber?: string;
  date: string;
  project_id?: string;
  project?: string;
  area: string;
  cleaning_type: string;
  performed_by: string;
  performed_by_id?: string;
  materials_used: string;
  notes: string;
  status: string;
  current_node_index?: number;
  current_active_node?: string;
  cleansing_workflow_nodes?: any[];
  cleansing_assignments?: any[];
  cleansing_comments?: any[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  active?: boolean;
}

export interface ProcessNodeUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface ProcessNode {
  id: string;
  type: 'start' | 'node' | 'end';
  name: string;
  executor?: string;
  executorId?: string;
  ccRecipients?: ProcessNodeUser[];
  editAccess: boolean;
  settings: Record<string, unknown>;
}

export interface CreateCleansingPayload {
  date: string;
  project_id: string;
  area: string;
  cleaning_type: string;
  performed_by: string;
  performed_by_id?: string;
  materials_used: string;
  notes: string;
  processNodes?: ProcessNode[];
  createdBy: string;
  name: string;
}

export interface UpdateCleansingPayload {
  date?: string;
  area?: string;
  cleaning_type?: string;
  performed_by?: string;
  materials_used?: string;
  notes?: string;
}

export interface WorkflowActionPayload {
  action: 'approve' | 'reject' | 'back';
  comment?: string;
  userId: string;
}

// GET /cleansing/list/:userId?projectId=...
export const getCleansingEntries = (userId: string, projectId?: string): Promise<CleansingEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/cleansing/list/${userId}${params}`).then(r => r.data);
};

// GET /cleansing/:id
export const getCleansingEntryById = (id: string): Promise<CleansingEntry> =>
  client.get(`/cleansing/${id}`).then(r => r.data);

// POST /cleansing/create
export const createCleansingEntry = (payload: CreateCleansingPayload): Promise<CleansingEntry> =>
  client.post('/cleansing/create', payload).then(r => r.data);

// PUT /cleansing/:id/update
export const updateCleansingEntry = (id: string, payload: UpdateCleansingPayload): Promise<CleansingEntry> =>
  client.put(`/cleansing/${id}/update`, payload).then(r => r.data);

// PUT /cleansing/:id/workflow
export const updateCleansingWorkflowAction = (id: string, payload: WorkflowActionPayload): Promise<CleansingEntry> =>
  client.put(`/cleansing/${id}/workflow`, payload).then(r => r.data);

// DELETE /cleansing/:id
export const deleteCleansingEntry = (id: string): Promise<any> =>
  client.delete(`/cleansing/${id}`).then(r => r.data);

// GET /cleansing/:id/history
export const getCleansingHistory = (id: string): Promise<any[]> =>
  client.get(`/cleansing/${id}/history`).then(r => r.data);

// POST /cleansing/:id/restore
export const restoreCleansingFromHistory = (id: string, historyId: string): Promise<any> =>
  client.post(`/cleansing/${id}/restore`, { historyId }).then(r => r.data);

// GET /cleansing/reports
export const getCleansingReports = (projectId: string, userId: string): Promise<any> =>
  client.get(`/cleansing/reports?projectId=${projectId}&userId=${userId}`).then(r => r.data);
