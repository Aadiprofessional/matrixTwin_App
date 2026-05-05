import client from './client';

export interface LabourRow {
  id?: string;
  trade: string;
  workersCount: number;
  hoursWorked: number;
}

export interface LabourEntry {
  id: string;
  form_number?: string;
  formNumber?: string;
  form_no?: string;
  formNo?: string;
  date: string;
  project_id?: string;
  project?: string;
  name?: string;
  // RN field names
  supervisor: string;
  supervisor_id?: string;
  trade: string;
  workers_count: number;
  hours_worked: number;
  tasks_completed: string;
  notes: string;
  // Web field name aliases (same data, different keys)
  submitter?: string;
  worker_count?: number;
  trade_type?: string;
  work_description?: string;
  labour_type?: string;
  status: string;
  labour_data?: LabourRow[];
  current_node_index?: number;
  current_active_node?: string;
  labour_workflow_nodes?: any[];
  labour_assignments?: any[];
  labour_comments?: any[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  expiresAt?: string;
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

export interface CreateLabourPayload {
  date: string;
  project_id: string;
  supervisor: string;
  supervisor_id?: string;
  trade: string;
  workers_count: number;
  hours_worked: number;
  tasks_completed: string;
  notes: string;
  labour_data?: LabourRow[];
  processNodes?: ProcessNode[];
  createdBy: string;
  name: string;
}

export interface WorkflowActionPayload {
  action: 'approve' | 'reject' | 'back';
  comment?: string;
  userId: string;
}

export interface MonthlyLabourReturn {
  project_id: string;
  month: string;
  year: number;
  total_workers: number;
  total_hours: number;
  trades: Record<string, { workers: number; hours: number }>;
  status: string;
  created_at: string;
}

// GET /labour/list/:userId?projectId=...
export const getLabourEntries = (userId: string, projectId?: string): Promise<LabourEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/labour/list/${userId}${params}`).then(r => r.data);
};

// GET /labour/:id
export const getLabourEntryById = (id: string): Promise<LabourEntry> =>
  client.get(`/labour/${id}`).then(r => r.data);

// POST /labour/create
export const createLabourEntry = (payload: CreateLabourPayload): Promise<LabourEntry> =>
  client.post('/labour/create', payload).then(r => r.data);

// PUT /labour/:id/update
export const updateLabourEntry = (id: string, payload: Partial<CreateLabourPayload>): Promise<LabourEntry> =>
  client.put(`/labour/${id}/update`, payload).then(r => r.data);

// PUT /labour/:id/workflow
export const updateLabourWorkflowAction = (id: string, payload: WorkflowActionPayload): Promise<LabourEntry> =>
  client.put(`/labour/${id}/workflow`, payload).then(r => r.data);

// DELETE /labour/:id
export const deleteLabourEntry = (id: string): Promise<any> =>
  client.delete(`/labour/${id}`).then(r => r.data);

// GET /labour/:id/history
export const getLabourHistory = (id: string): Promise<any[]> =>
  client.get(`/labour/${id}/history`).then(r => r.data);

// POST /labour/:id/restore
export const restoreLabourFromHistory = (id: string, historyId: string): Promise<any> =>
  client.post(`/labour/${id}/restore`, { historyId }).then(r => r.data);

// GET /labour/monthly-returns/:projectId
export const getMonthlyLabourReturns = (projectId: string): Promise<MonthlyLabourReturn[]> =>
  client.get(`/labour/monthly-returns/${projectId}`).then(r => r.data);

// GET /labour/reports
export const getLabourReports = (projectId: string, userId: string): Promise<any> =>
  client.get(`/labour/reports?projectId=${projectId}&userId=${userId}`).then(r => r.data);
