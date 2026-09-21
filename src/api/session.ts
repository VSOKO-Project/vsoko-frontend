import axios, { CanceledError } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiSuccessResult, LoginResultDto } from '../types';
import { API_BASE_URL } from '../utils/constants';

// Auth endpoints use a separate client so a failed refresh cannot refresh itself.
export const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

let pendingRefresh: { version: number; promise: Promise<LoginResultDto> } | undefined;

export function assertCurrentSession(version: number) {
  if (useAuthStore.getState().sessionVersion !== version) {
    throw new CanceledError('Session changed');
  }
}

export async function waitForRefresh() {
  if (pendingRefresh?.version === useAuthStore.getState().sessionVersion) {
    await pendingRefresh.promise;
  }
}

export function refreshSession(): Promise<LoginResultDto> {
  const { sessionVersion: version, refreshToken } = useAuthStore.getState();
  if (pendingRefresh?.version === version) return pendingRefresh.promise;

  const promise = (async () => {
    try {
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await authClient.post<ApiSuccessResult<LoginResultDto>>('/Security/Refresh', {
        refresh: refreshToken,
      });
      assertCurrentSession(version);
      useAuthStore.getState().updateSession(data.data);
      return data.data;
    } catch (error) {
      // A late response must never restore or sign out a different session.
      if (useAuthStore.getState().sessionVersion === version) useAuthStore.getState().logout();
      throw error;
    }
  })();

  pendingRefresh = { version, promise };
  const clear = () => {
    if (pendingRefresh?.promise === promise) pendingRefresh = undefined;
  };
  void promise.then(clear, clear);
  return promise;
}
