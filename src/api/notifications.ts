import client from './client';

// Matches the website's notification interface (same server, same fields)
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  form_type?: string;
  form_id?: string;
  project_id?: string;
  action_url?: string;
  metadata?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  page: number;
  limit: number;
}

// GET /notifications?page=1&limit=20&unread_only=false
export const getNotifications = (params?: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}): Promise<NotificationResponse> => {
  const p: Record<string, any> = {};
  if (params?.page) p.page = params.page;
  if (params?.limit) p.limit = params.limit;
  if (params?.unread_only) p.unread_only = params.unread_only;
  return client.get('/notifications', { params: p }).then(r => r.data);
};

// POST /notifications/mark-read/:id  (matches website)
export const markNotificationAsRead = (id: string): Promise<void> =>
  client.post(`/notifications/mark-read/${id}`).then(() => undefined);

// POST /notifications/mark-all-read
export const markAllNotificationsAsRead = (): Promise<void> =>
  client.post('/notifications/mark-all-read').then(() => undefined);

// DELETE /notifications/:id
export const deleteNotification = (id: string): Promise<void> =>
  client.delete(`/notifications/${id}`).then(() => undefined);

// DELETE /notifications/clear-all  (matches website)
export const clearAllNotifications = (): Promise<void> =>
  client.delete('/notifications/clear-all').then(() => undefined);
