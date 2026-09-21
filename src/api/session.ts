import axios, { CanceledError } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiSuccessResult, LoginResultDto } from '../types';
import { API_BASE_URL } from '../utils/constants';

export const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Web Locks serialize token-consuming operations across all tabs on this origin.
export async function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks) {
    return Promise.reject(new Error('Для входа нужен современный браузер и HTTPS.'));
  }
  return await navigator.locks.request('vsoko.auth', action);
}

let pendingRefresh: { version: number; promise: Promise<LoginResultDto | void> } | undefined;
let refreshFailure: { token: string; until: number; error: unknown } | undefined;

export function assertCurrentSession(version: number) {
  useAuthStore.getState().syncFromStorage();
  if (useAuthStore.getState().sessionVersion !== version) throw new CanceledError('Session changed');
}

export async function waitForRefresh() {
  if (pendingRefresh?.version === useAuthStore.getState().sessionVersion) await pendingRefresh.promise;
}

// Caller must hold withSessionLock; exported for password change's expired-token path.
export async function refreshSessionLocked(version: number): Promise<LoginResultDto> {
  assertCurrentSession(version);
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new CanceledError('No active session');
  if (refreshFailure?.token === refreshToken && refreshFailure.until > Date.now()) throw refreshFailure.error;
  try {
    const { data } = await authClient.post<ApiSuccessResult<LoginResultDto>>('/Security/Refresh', { refresh: refreshToken });
    assertCurrentSession(version);
    useAuthStore.getState().updateSession(data.data);
    refreshFailure = undefined;
    return data.data;
  } catch (error) {
    assertCurrentSession(version);
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
    } else if (!axios.isCancel(error)) {
      // Keep credentials during outages; avoid an immediate retry storm.
      refreshFailure = { token: refreshToken, until: Date.now() + 5_000, error };
    }
    throw error;
  }
}

export function refreshSession(): Promise<LoginResultDto | void> {
  useAuthStore.getState().syncFromStorage();
  const { sessionVersion: version, refreshToken } = useAuthStore.getState();
  if (pendingRefresh?.version === version) return pendingRefresh.promise;
  const promise = withSessionLock(async () => {
    assertCurrentSession(version);
    // Another tab may have refreshed while this one was waiting for the lock.
    if (useAuthStore.getState().refreshToken !== refreshToken) return;
    return refreshSessionLocked(version);
  });
  pendingRefresh = { version, promise };
  const clear = () => { if (pendingRefresh?.promise === promise) pendingRefresh = undefined; };
  void promise.then(clear, clear);
  return promise;
}
