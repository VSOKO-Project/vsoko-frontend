import axios, { CanceledError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { assertCurrentSession, refreshSession, waitForRefresh } from './session';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

type SessionRequest = InternalAxiosRequestConfig & { _retry?: boolean; _sessionVersion?: number };

api.interceptors.request.use(async (config: SessionRequest) => {
  useAuthStore.getState().syncFromStorage();
  config._sessionVersion ??= useAuthStore.getState().sessionVersion;
  await waitForRefresh();
  assertCurrentSession(config._sessionVersion);
  const session = useAuthStore.getState();
  if (!session.isAuthenticated || (session.mustChangePassword && config.url !== '/Security/ChangePassword')) {
    throw new CanceledError('Session is not ready');
  }
  config.headers.Authorization = `Bearer ${session.accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const config = response.config as SessionRequest;
    if (config._sessionVersion !== undefined) assertCurrentSession(config._sessionVersion);
    return response;
  },
  async (error) => {
    if (!axios.isAxiosError(error) || !error.config || axios.isCancel(error)) throw error;
    const originalRequest = error.config as SessionRequest;
    if (originalRequest._sessionVersion !== undefined) assertCurrentSession(originalRequest._sessionVersion);
    const passwordRequired = error.response?.status === 403 &&
      error.response?.data?.title === 'Password Change Required';

    if (error.response?.status !== 401 && !passwordRequired) throw error;
    if (originalRequest._retry) {
      // A late failure must not invalidate credentials installed by another tab.
      if (originalRequest.headers.Authorization !== `Bearer ${useAuthStore.getState().accessToken}`) throw error;
      if (passwordRequired) useAuthStore.getState().requirePasswordChange();
      else if (originalRequest.url !== '/Security/ChangePassword') useAuthStore.getState().logout();
      throw error;
    }
    originalRequest._retry = true;

    // Reuse a token already rotated by another request, including late 401/403 responses.
    const session = useAuthStore.getState();
    if (originalRequest.headers.Authorization === `Bearer ${session.accessToken}`) {
      await refreshSession();
    }
    if (useAuthStore.getState().mustChangePassword && originalRequest.url !== '/Security/ChangePassword') {
      throw error;
    }
    return api(originalRequest);
  }
);

export default api;
