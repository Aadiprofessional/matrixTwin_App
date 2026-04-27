import client from './client';

export interface SafetyChecklistItem {
  id: string;
  category: string;
  description: string;
  status: 'pass' | 'fail' | 'na';
  remarks?: string;
}

export interface SafetyEntry {
  id: string;
  form_number?: string;
  formNumber?: string;
  form_no?: string;
  date: string;
  project_id?: string;
  project?: string;
  inspector: string;
  inspector_id?: string;
  location: string;
  inspection_type: string;
  findings: string;
  corrective_actions: string;
  risk_level: string;
  safety_score?: number;
  findings_count?: number;
  checklist_items?: SafetyChecklistItem[];
  status: string;
  current_node_index?: number;
  current_active_node?: string;
  safety_workflow_nodes?: any[];
  safety_assignments?: any[];
  safety_comments?: any[];
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

export interface CreateSafetyPayload {
  date: string;
  project_id: string;
  inspector: string;
  inspector_id?: string;
  location: string;
  inspection_type: string;
  findings: string;
  corrective_actions: string;
  risk_level: string;
  safety_score?: number;
  checklist_items?: SafetyChecklistItem[];
  processNodes?: ProcessNode[];
  createdBy: string;
  name: string;
}

export interface WorkflowActionPayload {
  action: 'approve' | 'reject' | 'back';
  comment?: string;
  userId: string;
}

// GET /safety/list/:userId?projectId=...
export const getSafetyEntries = (userId: string, projectId?: string): Promise<SafetyEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/safety/list/${userId}${params}`).then(r => r.data);
};

// GET /safety/:id
export const getSafetyEntryById = (id: string): Promise<SafetyEntry> =>
  client.get(`/safety/${id}`).then(r => r.data);

// POST /safety/create
export const createSafetyEntry = (payload: CreateSafetyPayload): Promise<SafetyEntry> =>
  client.post('/safety/create', payload).then(r => r.data);

// PUT /safety/:id/update
export const updateSafetyEntry = (id: string, payload: Partial<CreateSafetyPayload>): Promise<SafetyEntry> =>
  client.put(`/safety/${id}/update`, payload).then(r => r.data);

// PUT /safety/:id/workflow
export const updateSafetyWorkflowAction = (id: string, payload: WorkflowActionPayload): Promise<SafetyEntry> =>
  client.put(`/safety/${id}/workflow`, payload).then(r => r.data);

// DELETE /safety/:id
export const deleteSafetyEntry = (id: string): Promise<any> =>
  client.delete(`/safety/${id}`).then(r => r.data);

// GET /safety/:id/history
export const getSafetyHistory = (id: string): Promise<any[]> =>
  client.get(`/safety/${id}/history`).then(r => r.data);

// POST /safety/:id/restore
export const restoreSafetyFromHistory = (id: string, historyId: string): Promise<any> =>
  client.post(`/safety/${id}/restore`, { historyId }).then(r => r.data);

// GET /safety/reports
export const getSafetyReports = (projectId: string, userId: string): Promise<any> =>
  client.get(`/safety/reports?projectId=${projectId}&userId=${userId}`).then(r => r.data);
