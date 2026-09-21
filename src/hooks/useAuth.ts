import { useMutation } from '@tanstack/react-query';
import { changePassword as changePasswordApi, login as loginApi, logout as logoutApi } from '../api/auth';
import { toast } from '../components/ui/Toast';
import type { ChangePasswordCommand, LoginQuery } from '../types';

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginQuery) => loginApi(data),
    retry: false,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordCommand) => changePasswordApi(data),
    retry: false,
    onError: (error) => {
      if (error.message === 'Пароль изменён. Войдите снова с новым паролем.') toast(error.message, 'info');
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: logoutApi,
    retry: false,
  });
}
