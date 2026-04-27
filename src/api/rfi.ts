import client from './client';

export interface RfiAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface RfiEntry {
  id: string;
  form_number?: string;
  formNumber?: string;
  subject: string;
  description: string;
  project_id?: string;
  project?: string;
  raised_by: string;
  raised_by_id?: string;
  assigned_to?: string;
  assigned_to_id?: string;
  priority: string;
  status: string;
  response?: string;
  response_date?: string;
  due_date?: string;
  attachments?: RfiAttachment[];
  current_node_index?: number;
  current_active_node?: string;
  rfi_workflow_nodes?: any[];
  rfi_assignments?: any[];
  rfi_comments?: any[];
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

export interface CreateRfiPayload {
  subject: string;
  description: string;
  project_id: string;
  priority: string;
  due_date?: string;
  raised_by?: string;
  assigned_to?: string;
  attachments?: File[];
  processNodes?: ProcessNode[];
  createdBy: string;
}

export interface UpdateRfiPayload {
  subject?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
  status?: string;
  response?: string;
  response_date?: string;
}

export interface WorkflowActionPayload {
  action: 'approve' | 'reject' | 'back' | 'respond';
  comment?: string;
  response?: string;
  userId: string;
}

// GET /rfi/list/:userId?projectId=...
export const getRfiEntries = (userId: string, projectId?: string): Promise<RfiEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/rfi/list/${userId}${params}`).then(r => r.data);
};

// GET /rfi/:id
export const getRfiEntryById = (id: string): Promise<RfiEntry> =>
  client.get(`/rfi/${id}`).then(r => r.data);

// POST /rfi/create
export const createRfiEntry = (payload: CreateRfiPayload): Promise<RfiEntry> =>
  client.post('/rfi/create', payload).then(r => r.data);

// PUT /rfi/:id/update
export const updateRfiEntry = (id: string, payload: UpdateRfiPayload): Promise<RfiEntry> =>
  client.put(`/rfi/${id}/update`, payload).then(r => r.data);

// PUT /rfi/:id/workflow
export const updateRfiWorkflowAction = (id: string, payload: WorkflowActionPayload): Promise<RfiEntry> =>
  client.put(`/rfi/${id}/workflow`, payload).then(r => r.data);

// DELETE /rfi/:id
export const deleteRfiEntry = (id: string): Promise<any> =>
  client.delete(`/rfi/${id}`).then(r => r.data);

// GET /rfi/:id/history
export const getRfiHistory = (id: string): Promise<any[]> =>
  client.get(`/rfi/${id}/history`).then(r => r.data);

// POST /rfi/:id/restore
export const restoreRfiFromHistory = (id: string, historyId: string): Promise<any> =>
  client.post(`/rfi/${id}/restore`, { historyId }).then(r => r.data);

// GET /rfi/reports
export const getRfiReports = (projectId: string, userId: string): Promise<any> =>
  client.get(`/rfi/reports?projectId=${projectId}&userId=${userId}`).then(r => r.data);
