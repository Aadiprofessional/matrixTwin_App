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

export const getDashboardStats = (projectId: string, userId: string): Promise<DashboardStats> =>
  client.get(`/global-forms/dashboard?projectId=${projectId}&userId=${userId}`).then(r => r.data);
