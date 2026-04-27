import client from './client';

export interface FormResponse {
  id: string;
  project_id: string;
  created_by: {
    name: string;
    email: string;
  };
  name: string;
  description: string;
  form_type: string;
  priority: string;
  status: string;
  file_url: string;
  response_url: string | null;
  created_at: string;
  updated_at: string;
  form_assignments?: {
    users: {
      name: string;
      email: string;
    };
    user_id: string;
  }[];
}

export interface ProcessNode {
  id: string;
  type: 'start' | 'node' | 'end';
  name: string;
  executor_id?: string;
  cc_recipients?: string[];
  edit_access?: boolean;
  expire_time?: string;
  settings?: Record<string, any>;
}

export interface FormData {
  id?: string;
  form_number?: string;
  form_type: string;
  project_id: string;
  created_by_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'submitted' | 'in_progress' | 'completed' | 'approved';
  assigned_to?: string[];
  workflow_nodes?: ProcessNode[];
  form_data: Record<string, any>;
  attachments?: string[];
  created_at?: string;
  updated_at?: string;
}

// RFI/RICS Forms
export const createRFI = async (data: FormData) => {
  const response = await client.post('/api/forms/rfi/create', {
    ...data,
    form_type: 'RFI'
  });
  return response.data;
};

export const getRFIs = async (projectId: string) => {
  const response = await client.get('/api/forms/rfi/list', {
    params: { project_id: projectId }
  });
  return response.data as FormResponse[];
};

export const getRFI = async (id: string) => {
  const response = await client.get(`/api/forms/rfi/${id}`);
  return response.data;
};

export const updateRFI = async (id: string, data: Partial<FormData>) => {
  const response = await client.patch(`/api/forms/rfi/${id}`, data);
  return response.data;
};

// Site Diary Forms
export const createSiteDiary = async (data: FormData) => {
  const response = await client.post('/api/forms/diary/create', {
    ...data,
    form_type: 'SITE_DIARY'
  });
  return response.data;
};

export const getSiteDiaries = async (projectId: string) => {
  const response = await client.get('/api/forms/diary/list', {
    params: { project_id: projectId }
  });
  return response.data as FormResponse[];
};

export const getSiteDiary = async (id: string) => {
  const response = await client.get(`/api/forms/diary/${id}`);
  return response.data;
};

export const updateSiteDiary = async (id: string, data: Partial<FormData>) => {
  const response = await client.patch(`/api/forms/diary/${id}`, data);
  return response.data;
};

// Safety Inspection Forms
export const createSafetyInspection = async (data: FormData) => {
  const response = await client.post('/api/forms/safety/create', {
    ...data,
    form_type: 'SAFETY_INSPECTION'
  });
  return response.data;
};

export const getSafetyInspections = async (projectId: string) => {
  const response = await client.get('/api/forms/safety/list', {
    params: { project_id: projectId }
  });
  return response.data as FormResponse[];
};

export const getSafetyInspection = async (id: string) => {
  const response = await client.get(`/api/forms/safety/${id}`);
  return response.data;
};

export const updateSafetyInspection = async (id: string, data: Partial<FormData>) => {
  const response = await client.patch(`/api/forms/safety/${id}`, data);
  return response.data;
};

// Labour Return Forms
export const createLabourReturn = async (data: FormData) => {
  const response = await client.post('/api/forms/labour/create', {
    ...data,
    form_type: 'LABOUR_RETURN'
  });
  return response.data;
};

export const getLabourReturns = async (projectId: string) => {
  const response = await client.get('/api/forms/labour/list', {
    params: { project_id: projectId }
  });
  return response.data as FormResponse[];
};

export const getLabourReturn = async (id: string) => {
  const response = await client.get(`/api/forms/labour/${id}`);
  return response.data;
};

export const updateLabourReturn = async (id: string, data: Partial<FormData>) => {
  const response = await client.patch(`/api/forms/labour/${id}`, data);
  return response.data;
};

// Cleansing Records
export const createCleansingRecord = async (data: FormData) => {
  const response = await client.post('/api/forms/cleansing/create', {
    ...data,
    form_type: 'CLEANSING_RECORD'
  });
  return response.data;
};

export const getCleansingRecords = async (projectId: string) => {
  const response = await client.get('/api/forms/cleansing/list', {
    params: { project_id: projectId }
  });
  return response.data as FormResponse[];
};

export const getCleansingRecord = async (id: string) => {
  const response = await client.get(`/api/forms/cleansing/${id}`);
  return response.data;
};

export const updateCleansingRecord = async (id: string, data: Partial<FormData>) => {
  const response = await client.patch(`/api/forms/cleansing/${id}`, data);
  return response.data;
};

// Generic form operations
export const updateFormStatus = async (id: string, status: string) => {
  const response = await client.patch(`/api/forms/${id}/status`, { status });
  return response.data;
};

export const submitFormResponse = async (formId: string, responseData: Record<string, any>) => {
  const response = await client.post(`/api/forms/${formId}/respond`, responseData);
  return response.data;
};

export const assignFormUsers = async (formId: string, userIds: string[]) => {
  const response = await client.post(`/api/forms/${formId}/assign`, { user_ids: userIds });
  return response.data;
};

export const deleteForm = async (id: string) => {
  const response = await client.delete(`/api/forms/${id}`);
  return response.data;
};
