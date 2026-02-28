import { create } from 'zustand';
import type { LoginResultDto } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (data: LoginResultDto) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  isAdmin: false,
  isAuthenticated: false,

  login: (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('userId', data.userId);
    localStorage.setItem('isAdmin', String(data.isAdmin));
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId: data.userId,
      isAdmin: data.isAdmin,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.clear();
    set({
      accessToken: null,
      refreshToken: null,
      userId: null,
      isAdmin: false,
      isAuthenticated: false,
    });
  },

  hydrate: () => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      set({
        accessToken,
        refreshToken: localStorage.getItem('refreshToken'),
        userId: localStorage.getItem('userId'),
        isAdmin: localStorage.getItem('isAdmin') === 'true',
        isAuthenticated: true,
      });
    }
  },
}));
