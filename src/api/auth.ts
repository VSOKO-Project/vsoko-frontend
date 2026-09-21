import axios from 'axios';
import { assertCurrentSession, authClient, refreshSessionLocked, withSessionLock } from './session';
import { useAuthStore } from '../store/authStore';
import type { ApiSuccessResult, ChangePasswordCommand, LoginQuery, LoginResultDto } from '../types';

export async function login(data: LoginQuery): Promise<ApiSuccessResult<LoginResultDto>> {
  useAuthStore.getState().syncFromStorage();
  const version = useAuthStore.getState().sessionVersion;
  return withSessionLock(async () => {
    assertCurrentSession(version);
    const response = await authClient.post<ApiSuccessResult<LoginResultDto>>('/Security/Login', data);
    assertCurrentSession(version);
    useAuthStore.getState().login(response.data.data);
    return response.data;
  });
}

export async function logout(): Promise<void> {
  useAuthStore.getState().syncFromStorage();
  const version = useAuthStore.getState().sessionVersion;
  return withSessionLock(async () => {
    assertCurrentSession(version);
    const { refreshToken } = useAuthStore.getState();
    // Clear every tab before the request, so a network outage cannot leave UI signed in.
    useAuthStore.getState().logout();
    if (refreshToken) await authClient.post('/Security/LogOut', { refresh: refreshToken });
  });
}

let pendingPasswordChange: { version: number; promise: Promise<void> } | undefined;
export function changePassword(data: ChangePasswordCommand): Promise<void> {
  useAuthStore.getState().syncFromStorage();
  const { sessionVersion: version, accessToken } = useAuthStore.getState();
  if (pendingPasswordChange?.version === version) return pendingPasswordChange.promise;
  const promise = withSessionLock(async () => {
    assertCurrentSession(version);
    // A successful password change in another tab already completed this operation.
    if (useAuthStore.getState().accessToken !== accessToken && !useAuthStore.getState().mustChangePassword) return;
    const submit = () => authClient.post<ApiSuccessResult<LoginResultDto>>('/Security/ChangePassword', data, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
    });
    let response;
    try {
      response = await submit();
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
      await refreshSessionLocked(version);
      response = await submit();
    }
    assertCurrentSession(version);
    if (!response.data.data?.accessToken) {
      // Compatibility with a backend that has not yet deployed the session response.
      await refreshSessionLocked(version);
    } else {
      useAuthStore.getState().updateSession(response.data.data);
    }
  });
  pendingPasswordChange = { version, promise };
  const clear = () => { if (pendingPasswordChange?.promise === promise) pendingPasswordChange = undefined; };
  void promise.then(clear, clear);
  return promise;
}
