import client from './client';

export interface WorkflowRecipient {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'node' | 'end';
  name: string;
  executor?: string;
  executorId?: string;
  executorName?: string;
  ccRecipients?: WorkflowRecipient[];
  editAccess?: boolean;
  settings?: Record<string, unknown>;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[];
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FormPageStructure {
  id: string;
  title?: string;
  fields?: FormField[];
  dimensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FormStructure {
  pages: FormPageStructure[];
  workflow?: WorkflowNode[];
  [key: string]: unknown;
}

export interface CustomFormTemplate {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  process_nodes?: WorkflowNode[] | string;
  processNodes?: WorkflowNode[] | string;
  form_structure?: FormStructure | string;
  formStructure?: FormStructure | string;
  created_at?: string;
  fieldsCount?: number;
}

export interface CustomFormEntry {
  id: string;
  template_id: string;
  template_name: string;
  project_id?: string;
  form_data?: Record<string, unknown>;
  status: string;
  current_node_index?: number;
  current_active_node?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  form_workflow_nodes?: Array<Record<string, unknown>>;
  form_comments?: Array<Record<string, unknown>>;
}

export interface SaveCustomFormTemplatePayload {
  name: string;
  description?: string;
  formStructure: FormStructure;
  processNodes: WorkflowNode[];
  projectId: string;
}

export interface CreateCustomFormEntryPayload {
  templateId: string;
  formData: Record<string, unknown>;
  projectId: string;
}

export interface UpdateCustomFormEntryPayload {
  formData?: Record<string, unknown>;
  action: 'approve' | 'reject' | 'back' | 'update';
  comment?: string;
  userId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeFormStructure = (raw: unknown): FormStructure => {
  let parsed = raw;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = { pages: [] };
    }
  }

  if (!isRecord(parsed)) {
    return { pages: [] };
  }

  const nestedPages = parsed.pages;
  if (isRecord(nestedPages) && Array.isArray(nestedPages.pages)) {
    return {
      ...parsed,
      pages: nestedPages.pages as FormPageStructure[],
    };
  }

  return {
    ...parsed,
    pages: Array.isArray(parsed.pages) ? (parsed.pages as FormPageStructure[]) : [],
  };
};

const normalizeProcessNodes = (raw: unknown): WorkflowNode[] => {
  let parsed = raw;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }

  return Array.isArray(parsed) ? (parsed as WorkflowNode[]) : [];
};

export const normalizeCustomFormTemplate = (template: CustomFormTemplate) => {
  const formStructure = normalizeFormStructure(template.form_structure || template.formStructure);
  const processNodes = normalizeProcessNodes(template.process_nodes || template.processNodes);

  return {
    ...template,
    form_structure: formStructure,
    process_nodes: processNodes,
    fieldsCount: formStructure.pages.reduce(
      (count, page) => count + (Array.isArray(page.fields) ? page.fields.length : 0),
      0,
    ),
  };
};

export const getCustomFormTemplates = async (projectId: string) => {
  const response = await client.get<CustomFormTemplate[]>('/custom-forms/templates', {
    params: { projectId },
  });
  return response.data.map(normalizeCustomFormTemplate);
};

export const createCustomFormTemplate = async (payload: SaveCustomFormTemplatePayload) => {
  const response = await client.post('/custom-forms/templates/create', payload);
  return response.data;
};

export const updateCustomFormTemplate = async (templateId: string, payload: SaveCustomFormTemplatePayload) => {
  const response = await client.put(`/custom-forms/templates/${templateId}`, payload);
  return response.data;
};

export const deleteCustomFormTemplate = async (templateId: string) => {
  const response = await client.delete(`/custom-forms/templates/${templateId}`);
  return response.data;
};

export const getCustomFormEntryDetails = async (entryId: string) => {
  const response = await client.get<CustomFormEntry>(`/custom-forms/entries/details/${entryId}`);
  return response.data;
};

export const getCustomFormEntries = async (userId: string, projectId?: string) => {
  const response = await client.get<CustomFormEntry[]>(`/custom-forms/entries/${userId}`, {
    params: projectId ? { projectId } : undefined,
  });
  return response.data;
};

export const createCustomFormEntry = async (payload: CreateCustomFormEntryPayload) => {
  const response = await client.post('/custom-forms/entries/create', payload);
  return response.data;
};

export const updateCustomFormEntry = async (entryId: string, payload: UpdateCustomFormEntryPayload) => {
  const response = await client.put(`/custom-forms/entries/${entryId}/update`, payload);
  return response.data;
};
