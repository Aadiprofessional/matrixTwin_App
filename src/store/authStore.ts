import { create } from 'zustand';
import { storage } from '../utils/storage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id?: string;
  avatar?: string;
  status?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  setInitialized: (val: boolean) => void;
  logout: () => void;
}

const storedUser = (): AuthUser | null => {
  const raw = storage.getString('auth_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
};

const storedToken = storage.getString('auth_token') ?? null;

export const useAuthStore = create<AuthState>(set => ({
  token: storedToken,
  user: storedToken ? storedUser() : null,
  isAuthenticated: !!storedToken,
  isInitialized: false,

  setToken: (token: string) => {
    storage.set('auth_token', token);
    set({ token, isAuthenticated: true });
  },

  setUser: (user: AuthUser) => {
    storage.set('auth_user', JSON.stringify(user));
    set({ user });
  },

  setInitialized: (val: boolean) => set({ isInitialized: val }),

  logout: () => {
    storage.delete('auth_token');
    storage.delete('auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

