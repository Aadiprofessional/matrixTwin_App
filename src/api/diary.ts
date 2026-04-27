import client from './client';

export interface StaffRow {
  staffTitle: string;
  staffCount: string;
}

export interface LabourRow {
  labourType: string;
  labourCode: string;
  labourCount: string;
}

export interface EquipmentRow {
  equipmentType: string;
  totalOnSite: string;
  working: string;
  idling: string;
}

export interface AssistanceRow {
  description: string;
  workNo: string;
}

export interface SiteDiarySignatures {
  projectManagerName: string;
  projectManagerDate: string;
  contractorRepName: string;
  contractorRepDate: string;
  supervisorName: string;
  supervisorDate: string;
}

export interface SiteDiaryFormData {
  formNumber: string;
  date: string;
  contractNo: string;
  day: string;
  contractDate: string;
  toBeInsert: string;
  clientDepartment: string;
  contractor: string;
  weatherAM: string;
  weatherPM: string;
  rainfall: string;
  signal: string;
  instructions: string;
  comments: string;
  utilities: string;
  visitor: string;
  remarks: string;
  weather?: string;
  temperature?: string;
  work_completed: string;
  incidents_reported: string;
  materials_delivered: string;
  notes: string;
  staffData: StaffRow[];
  staffData2: StaffRow[];
  labourData: LabourRow[];
  equipmentData: EquipmentRow[];
  assistanceData: AssistanceRow[];
  signatures: SiteDiarySignatures;
}

export interface ProcessNodeUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface SaveProcessNode {
  id: string;
  type: 'start' | 'node' | 'end';
  name: string;
  executor?: string;
  executorId?: string;
  ccRecipients?: ProcessNodeUser[];
  editAccess: boolean;
  settings: Record<string, unknown>;
}

export interface DiaryEntry {
  id: string;
  form_number?: string;
  formNumber?: string;
  form_no?: string;
  formNo?: string;
  date: string;
  project?: string;
  name?: string;
  project_id?: string;
  author: string;
  weather: string;
  temperature: string;
  work_completed: string;
  incidents_reported: string;
  materials_delivered: string;
  notes: string;
  form_data?: Partial<SiteDiaryFormData>;
  status: string;
  current_node_index?: number;
  current_active_node?: string;
  diary_workflow_nodes?: any[];
  diary_assignments?: any[];
  diary_comments?: any[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
  expires_at?: string;
  expiresAt?: string;
  active?: boolean;
}

export interface CreateDiaryEntryPayload {
  formData: SiteDiaryFormData;
  processNodes: SaveProcessNode[];
  createdBy: string;
  project_id: string;
  formId: string;
  name: string;
  expiresAt: string;
}

export interface WorkflowActionPayload {
  action: 'approve' | 'reject' | 'back';
  comment?: string;
  userId: string;
}

export interface FormUpdatePayload {
  formData: SiteDiaryFormData;
  action: 'update';
  userId: string;
}

// GET /diary/list/:userId?projectId=...
export const getDiaryEntries = (userId: string, projectId?: string): Promise<DiaryEntry[]> => {
  const params = projectId ? `?projectId=${projectId}` : '';
  return client.get(`/diary/list/${userId}${params}`).then(r => r.data);
};

// GET /diary/:id
export const getDiaryEntryById = (id: string): Promise<DiaryEntry> =>
  client.get(`/diary/${id}`).then(r => r.data);

// POST /diary/create
export const createDiaryEntry = (payload: CreateDiaryEntryPayload): Promise<DiaryEntry> =>
  client.post('/diary/create', payload).then(r => r.data);

// PUT /diary/:id/update
export const updateDiaryWorkflowAction = (id: string, payload: WorkflowActionPayload): Promise<DiaryEntry> =>
  client.put(`/diary/${id}/update`, payload).then(r => r.data);

// PUT /diary/:id/update
export const updateDiaryFormData = (id: string, payload: FormUpdatePayload): Promise<DiaryEntry> =>
  client.put(`/diary/${id}/update`, payload).then(r => r.data);

// DELETE /diary/:id
export const deleteDiaryEntry = (id: string): Promise<any> =>
  client.delete(`/diary/${id}`).then(r => r.data);

// GET /diary/:id/history
export const getDiaryHistory = (id: string): Promise<any[]> =>
  client.get(`/diary/${id}/history`).then(r => r.data);

// POST /diary/:id/restore
export const restoreDiaryFromHistory = (id: string, historyId: string): Promise<any> =>
  client.post(`/diary/${id}/restore`, { historyId }).then(r => r.data);

// PATCH /diary/:id/expiry
export const setDiaryExpiry = (id: string, userId: string, expiresAt: string): Promise<any> =>
  client.patch(`/diary/${id}/expiry`, { userId, expiresAt }).then(r => r.data);

// PATCH /diary/:id/expiry-status
export const setDiaryExpiryStatus = (id: string, userId: string, active: boolean): Promise<any> =>
  client.patch(`/diary/${id}/expiry-status`, { userId, active }).then(r => r.data);

// PATCH /diary/:id/name
export const renameDiary = (id: string, userId: string, name: string): Promise<any> =>
  client.patch(`/diary/${id}/name`, { userId, name }).then(r => r.data);

// POST /diary/:id/nodes/:nodeOrder/delay-notify
export const sendNodeReminder = (id: string, nodeOrder: number, userId: string, message: string): Promise<any> =>
  client.post(`/diary/${id}/nodes/${nodeOrder}/delay-notify`, { userId, message }).then(r => r.data);
