import client from './client';

export interface DashboardStats {
  total_forms: number;
  pending_total: number;
  completed_total: number;
  by_type: Record<string, {
    label?: string;
    type?: string;
    total: number;
    pending: number;
    completed: number;
  }>;
}

export interface ProjectAnalytics {
  projectId: string;
  projectName: string;
  totalForms: number;
  completedForms: number;
  pendingForms: number;
  rejectedForms: number;
  averageCompletionTime: number;
  formsByType: Record<string, number>;
  formsByStatus: Record<string, number>;
  weeklyTrends: Array<{ date: string; count: number }>;
  monthlyTrends: Array<{ month: string; count: number }>;
}

export interface FormAnalytics {
  formId: string;
  formName: string;
  totalResponses: number;
  completedResponses: number;
  pendingResponses: number;
  rejectedResponses: number;
  averageCompletionTime: number;
  responsesByDay: Array<{ date: string; count: number }>;
  assigneePerformance: Array<{ assignee: string; completed: number; pending: number }>;
}

export interface SafetyAnalytics {
  projectId: string;
  totalInspections: number;
  averageSafetyScore: number;
  inspectionsByType: Record<string, number>;
  inspectionsByRiskLevel: Record<string, number>;
  criticalFindings: number;
  correctiveActionsOpen: number;
  correctiveActionsCompleted: number;
  monthlyTrends: Array<{ month: string; inspections: number; avgScore: number }>;
}

export interface LabourAnalytics {
  projectId: string;
  totalLabourReturns: number;
  totalWorkersOnSite: number;
  totalHoursWorked: number;
  tradeDistribution: Record<string, { workers: number; hours: number }>;
  weeklyTrends: Array<{ week: string; workers: number; hours: number }>;
  monthlyReturns: Array<{ month: string; returns: number; workers: number; hours: number }>;
}

export interface ReportData {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  generatedDate: string;
  projectId: string;
  content: Record<string, unknown>;
  fileUrl?: string;
}

// GET /dashboard
export const getDashboard = (projectId: string, userId: string): Promise<DashboardStats> =>
  client.get('/dashboard', { params: { projectId, userId } }).then(r => r.data);

// GET /analytics/project/:projectId
export const getProjectAnalytics = (projectId: string): Promise<ProjectAnalytics> =>
  client.get(`/analytics/project/${projectId}`).then(r => r.data);

// GET /analytics/forms/:formId
export const getFormAnalytics = (formId: string): Promise<FormAnalytics> =>
  client.get(`/analytics/forms/${formId}`).then(r => r.data);

// GET /analytics/safety/:projectId
export const getSafetyAnalytics = (projectId: string): Promise<SafetyAnalytics> =>
  client.get(`/analytics/safety/${projectId}`).then(r => r.data);

// GET /analytics/labour/:projectId
export const getLabourAnalytics = (projectId: string): Promise<LabourAnalytics> =>
  client.get(`/analytics/labour/${projectId}`).then(r => r.data);

// POST /reports/generate
export const generateReport = (payload: {
  projectId: string;
  type: 'daily' | 'weekly' | 'monthly';
  modules?: string[];
  format?: 'pdf' | 'excel';
}): Promise<ReportData> =>
  client.post('/reports/generate', payload).then(r => r.data);

// GET /reports/list/:projectId
export const getProjectReports = (projectId: string): Promise<ReportData[]> =>
  client.get(`/reports/list/${projectId}`).then(r => r.data);

// GET /reports/:reportId/download
export const downloadReport = (reportId: string): Promise<any> =>
  client.get(`/reports/${reportId}/download`, { responseType: 'blob' }).then(r => r.data);

// DELETE /reports/:reportId
export const deleteReport = (reportId: string): Promise<any> =>
  client.delete(`/reports/${reportId}`).then(r => r.data);

// GET /analytics/export/:projectId
export const exportAnalytics = (projectId: string, format: 'pdf' | 'excel' = 'pdf'): Promise<Blob> =>
  client.get(`/analytics/export/${projectId}`, { params: { format }, responseType: 'blob' }).then(r => r.data);
