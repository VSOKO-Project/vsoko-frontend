import api from './axios';
import { assertCurrentSession, authClient, refreshSession, waitForRefresh } from './session';
import { useAuthStore } from '../store/authStore';
import type { ApiSuccessResult, ChangePasswordCommand, LoginQuery, LoginResultDto } from '../types';

export async function login(data: LoginQuery): Promise<ApiSuccessResult<LoginResultDto>> {
  const version = useAuthStore.getState().sessionVersion;
  const response = await authClient.post<ApiSuccessResult<LoginResultDto>>('/Security/Login', data);
  assertCurrentSession(version);
  useAuthStore.getState().login(response.data.data);
  return response.data;
}

export async function logout(): Promise<void> {
  const { refreshToken, logout: clearSession } = useAuthStore.getState();
  clearSession();
  if (refreshToken) await authClient.post('/Security/LogOut', { refresh: refreshToken });
}

let pendingPasswordChange: { version: number; promise: Promise<void> } | undefined;

export function changePassword(data: ChangePasswordCommand): Promise<void> {
  const version = useAuthStore.getState().sessionVersion;
  if (pendingPasswordChange?.version === version) return pendingPasswordChange.promise;

  const promise = (async () => {
    await api.post('/Security/ChangePassword', data);
    try {
      // A refresh started before ChangePassword finished may still contain the old claim.
      await waitForRefresh();
      assertCurrentSession(version);
      const session = await refreshSession();
      if (session.mustChangePassword) {
        useAuthStore.getState().logout();
        throw new Error('Password change is still required');
      }
    } catch {
      throw new Error('Пароль изменён. Войдите снова с новым паролем.');
    }
  })();
  pendingPasswordChange = { version, promise };
  const clear = () => {
    if (pendingPasswordChange?.promise === promise) pendingPasswordChange = undefined;
  };
  void promise.then(clear, clear);
  return promise;
}
