import client from './client';

export interface Notification {
  id: string;
  userId: string;
  type: 'form_assigned' | 'form_completed' | 'form_rejected' | 'workflow_update' | 'team_invitation' | 'project_update' | 'safety_alert' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: string;
}

export interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  byType: Record<string, number>;
}

// GET /notifications
export const getNotifications = (limit: number = 20, offset: number = 0): Promise<Notification[]> =>
  client.get('/notifications', { params: { limit, offset } }).then(r => r.data);

// GET /notifications/unread
export const getUnreadNotifications = (): Promise<Notification[]> =>
  client.get('/notifications/unread').then(r => r.data);

// GET /notifications/stats
export const getNotificationStats = (): Promise<NotificationStats> =>
  client.get('/notifications/stats').then(r => r.data);

// PUT /notifications/:id/read
export const markNotificationAsRead = (id: string): Promise<Notification> =>
  client.put(`/notifications/${id}/read`, {}).then(r => r.data);

// POST /notifications/mark-all-read
export const markAllNotificationsAsRead = (): Promise<any> =>
  client.post('/notifications/mark-all-read', {}).then(r => r.data);

// DELETE /notifications/:id
export const deleteNotification = (id: string): Promise<any> =>
  client.delete(`/notifications/${id}`).then(r => r.data);

// DELETE /notifications
export const deleteAllNotifications = (): Promise<any> =>
  client.delete('/notifications').then(r => r.data);

// POST /notifications/subscribe
export const subscribeToNotifications = (deviceToken: string, platform: string): Promise<any> =>
  client.post('/notifications/subscribe', { deviceToken, platform }).then(r => r.data);

// POST /notifications/unsubscribe
export const unsubscribeFromNotifications = (deviceToken: string): Promise<any> =>
  client.post('/notifications/unsubscribe', { deviceToken }).then(r => r.data);
