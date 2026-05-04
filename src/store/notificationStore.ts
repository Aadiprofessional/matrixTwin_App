import { create } from 'zustand';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification,
} from '../api/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  pollingTimer: ReturnType<typeof setInterval> | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;

  // Utility used by header/modal
  formatRelativeTime: (timestamp: string) => string;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  pollingTimer: null,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const response = await getNotifications({ page: 1, limit: 20 });
      set({
        notifications: response.notifications ?? [],
        unreadCount: response.unreadCount ?? 0,
      });
    } catch (err) {
      // Silently fail – badge simply shows stale data
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await markNotificationAsRead(id);
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - (state.notifications.find(n => n.id === id && !n.read) ? 1 : 0)),
      }));
    } catch (_) {}
  },

  markAllAsRead: async () => {
    try {
      await markAllNotificationsAsRead();
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (_) {}
  },

  removeNotification: async (id: string) => {
    const notif = get().notifications.find(n => n.id === id);
    try {
      await deleteNotification(id);
      set(state => ({
        notifications: state.notifications.filter(n => n.id !== id),
        unreadCount: notif && !notif.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));
    } catch (_) {}
  },

  clearAll: async () => {
    try {
      await clearAllNotifications();
      set({ notifications: [], unreadCount: 0 });
    } catch (_) {}
  },

  startPolling: () => {
    // Avoid duplicate timers
    const existing = get().pollingTimer;
    if (existing) return;

    get().fetchNotifications();
    const timer = setInterval(() => {
      get().fetchNotifications();
    }, 30000);
    set({ pollingTimer: timer });
  },

  stopPolling: () => {
    const timer = get().pollingTimer;
    if (timer) {
      clearInterval(timer);
      set({ pollingTimer: null });
    }
  },

  // Mirrors website's notificationService.formatRelativeTime
  formatRelativeTime: (timestamp: string): string => {
    const now = new Date();
    const t = new Date(timestamp);
    const diff = Math.floor((now.getTime() - t.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) { const m = Math.floor(diff / 60); return `${m} min${m > 1 ? 's' : ''} ago`; }
    if (diff < 86400) { const h = Math.floor(diff / 3600); return `${h} hour${h > 1 ? 's' : ''} ago`; }
    if (diff < 604800) { const d = Math.floor(diff / 86400); return `${d} day${d > 1 ? 's' : ''} ago`; }
    return t.toLocaleDateString();
  },
}));
