import client from './client';

export interface SmartLock {
  id: string;
  name: string;
  location: string;
  projectId: string;
  lockType: 'electronic' | 'rfid' | 'biometric' | 'hybrid';
  status: 'locked' | 'unlocked' | 'offline' | 'error';
  batteryLevel?: number;
  lastAccessTime?: string;
  lastAccessBy?: string;
  authorizedUsers?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface LockAccess {
  id: string;
  lockId: string;
  userId: string;
  userName: string;
  action: 'unlock' | 'lock' | 'attempt_failed';
  success: boolean;
  method: 'rfid' | 'biometric' | 'app' | 'manual' | 'remote';
  timestamp: string;
  reason?: string;
  duration?: number;
}

export interface AccessLog {
  lockId: string;
  lockName: string;
  recentAccess: LockAccess[];
  totalAccess: number;
  lastAccess?: string;
}

export interface LockConfiguration {
  lockId: string;
  autoLockTime?: number;
  allowRemoteUnlock: boolean;
  requireApproval: boolean;
  notifyOnAccess: boolean;
  logAllAttempts: boolean;
  restrictedHours?: { start: string; end: string };
}

export interface SmartLockAlert {
  id: string;
  lockId: string;
  lockName: string;
  type: 'multiple_failed_attempts' | 'unauthorized_access' | 'battery_low' | 'offline' | 'tamper_detected';
  message: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  resolvedAt?: string;
}

// GET /smart-locks/project/:projectId
export const getProjectLocks = (projectId: string): Promise<SmartLock[]> =>
  client.get(`/smart-locks/project/${projectId}`).then(r => r.data);

// GET /smart-locks/:lockId
export const getSmartLock = (lockId: string): Promise<SmartLock> =>
  client.get(`/smart-locks/${lockId}`).then(r => r.data);

// POST /smart-locks
export const createSmartLock = (payload: Omit<SmartLock, 'id' | 'createdAt' | 'updatedAt'>): Promise<SmartLock> =>
  client.post('/smart-locks', payload).then(r => r.data);

// PUT /smart-locks/:lockId
export const updateSmartLock = (lockId: string, payload: Partial<SmartLock>): Promise<SmartLock> =>
  client.put(`/smart-locks/${lockId}`, payload).then(r => r.data);

// DELETE /smart-locks/:lockId
export const deleteSmartLock = (lockId: string): Promise<any> =>
  client.delete(`/smart-locks/${lockId}`).then(r => r.data);

// POST /smart-locks/:lockId/unlock
export const unlockSmartLock = (lockId: string, reason?: string, durationMinutes?: number): Promise<any> =>
  client.post(`/smart-locks/${lockId}/unlock`, { reason, durationMinutes }).then(r => r.data);

// POST /smart-locks/:lockId/lock
export const lockSmartLock = (lockId: string): Promise<any> =>
  client.post(`/smart-locks/${lockId}/lock`, {}).then(r => r.data);

// GET /smart-locks/:lockId/access-log
export const getLockAccessLog = (lockId: string, limit: number = 100): Promise<LockAccess[]> =>
  client.get(`/smart-locks/${lockId}/access-log`, { params: { limit } }).then(r => r.data);

// GET /smart-locks/project/:projectId/access-logs
export const getProjectAccessLogs = (projectId: string): Promise<AccessLog[]> =>
  client.get(`/smart-locks/project/${projectId}/access-logs`).then(r => r.data);

// POST /smart-locks/:lockId/authorize-user
export const authorizeUser = (lockId: string, userId: string): Promise<SmartLock> =>
  client.post(`/smart-locks/${lockId}/authorize-user`, { userId }).then(r => r.data);

// POST /smart-locks/:lockId/revoke-access
export const revokeUserAccess = (lockId: string, userId: string): Promise<SmartLock> =>
  client.post(`/smart-locks/${lockId}/revoke-access`, { userId }).then(r => r.data);

// GET /smart-locks/:lockId/configuration
export const getLockConfiguration = (lockId: string): Promise<LockConfiguration> =>
  client.get(`/smart-locks/${lockId}/configuration`).then(r => r.data);

// PUT /smart-locks/:lockId/configuration
export const updateLockConfiguration = (lockId: string, payload: Partial<LockConfiguration>): Promise<LockConfiguration> =>
  client.put(`/smart-locks/${lockId}/configuration`, payload).then(r => r.data);

// GET /smart-locks/alerts
export const getSmartLockAlerts = (projectId: string): Promise<SmartLockAlert[]> =>
  client.get('/smart-locks/alerts', { params: { projectId } }).then(r => r.data);

// PUT /smart-locks/alerts/:alertId/resolve
export const resolveSmartLockAlert = (alertId: string): Promise<SmartLockAlert> =>
  client.put(`/smart-locks/alerts/${alertId}/resolve`, {}).then(r => r.data);
