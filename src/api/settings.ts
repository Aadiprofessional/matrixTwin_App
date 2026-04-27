import client from './client';

export interface AppSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone?: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  digest_frequency: 'instant' | 'daily' | 'weekly' | 'never';
  auto_sync: boolean;
  sync_interval: number;
  default_project_id?: string;
  [key: string]: any;
}

export interface NotificationPreferences {
  userId: string;
  form_created: boolean;
  form_completed: boolean;
  form_rejected: boolean;
  form_assigned: boolean;
  workflow_update: boolean;
  team_invitation: boolean;
  project_update: boolean;
  safety_alert: boolean;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly' | 'monthly';
}

export interface Privacy {
  userId: string;
  profile_public: boolean;
  show_online_status: boolean;
  share_activity: boolean;
  share_location?: boolean;
  data_collection_consent: boolean;
}

export interface AppInfo {
  version: string;
  buildNumber: number;
  releaseDate: string;
  features: string[];
}

// GET /settings/app
export const getAppSettings = (): Promise<AppSettings> =>
  client.get('/settings/app').then(r => r.data);

// PUT /settings/app
export const updateAppSettings = (payload: Partial<AppSettings>): Promise<AppSettings> =>
  client.put('/settings/app', payload).then(r => r.data);

// GET /settings/notifications
export const getNotificationPreferences = (): Promise<NotificationPreferences> =>
  client.get('/settings/notifications').then(r => r.data);

// PUT /settings/notifications
export const updateNotificationPreferences = (payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> =>
  client.put('/settings/notifications', payload).then(r => r.data);

// GET /settings/privacy
export const getPrivacySettings = (): Promise<Privacy> =>
  client.get('/settings/privacy').then(r => r.data);

// PUT /settings/privacy
export const updatePrivacySettings = (payload: Partial<Privacy>): Promise<Privacy> =>
  client.put('/settings/privacy', payload).then(r => r.data);

// GET /settings/app-info
export const getAppInfo = (): Promise<AppInfo> =>
  client.get('/settings/app-info').then(r => r.data);

// DELETE /settings/account
export const deleteAccount = (): Promise<any> =>
  client.delete('/settings/account').then(r => r.data);

// POST /settings/export-data
export const exportUserData = (): Promise<Blob> =>
  client.post('/settings/export-data', {}, { responseType: 'blob' }).then(r => r.data);

// POST /settings/clear-cache
export const clearAppCache = (): Promise<any> =>
  client.post('/settings/clear-cache', {}).then(r => r.data);
