import { create } from 'zustand';
import type { LoginResultDto } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  sessionVersion: number;
  login: (data: LoginResultDto) => void;
  updateSession: (data: LoginResultDto) => void;
  logout: () => void;
  requirePasswordChange: () => void;
}

const storageKeys = ['accessToken', 'refreshToken', 'userId', 'isAdmin', 'mustChangePassword'] as const;

function saveSession(data: LoginResultDto) {
  const session = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.userId,
    isAdmin: data.isAdmin,
    mustChangePassword: data.mustChangePassword,
    isAuthenticated: true,
  };
  for (const key of storageKeys) localStorage.setItem(key, String(session[key]));
  return session;
}

const storedAccessToken = localStorage.getItem('accessToken');

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: storedAccessToken,
  refreshToken: localStorage.getItem('refreshToken'),
  userId: localStorage.getItem('userId'),
  isAdmin: localStorage.getItem('isAdmin') === 'true',
  mustChangePassword: localStorage.getItem('mustChangePassword') === 'true',
  isAuthenticated: !!storedAccessToken,
  sessionVersion: 0,

  login: (data) => {
    set({ ...saveSession(data), sessionVersion: get().sessionVersion + 1 });
  },

  updateSession: (data) => set(saveSession(data)),

  logout: () => {
    for (const key of storageKeys) localStorage.removeItem(key);
    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      isAdmin: false,
      mustChangePassword: false,
      isAuthenticated: false,
      sessionVersion: get().sessionVersion + 1,
    });
  },

  requirePasswordChange: () => {
    localStorage.setItem('mustChangePassword', 'true');
    set({ mustChangePassword: true });
  },
}));

export function getHomePath(session: Pick<AuthState, 'isAuthenticated' | 'isAdmin' | 'mustChangePassword'>) {
  if (!session.isAuthenticated) return '/login';
  if (session.mustChangePassword) return '/change-password';
  return session.isAdmin ? '/dashboard' : '/workloads';
}
