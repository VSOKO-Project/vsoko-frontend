import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { changePassword as changePasswordApi, login as loginApi, logout as logoutApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import type { ChangePasswordCommand, LoginQuery } from '../types';

export function useLogin() {
  const storeLogin = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginQuery) => loginApi(data),
    onSuccess: (result) => {
      storeLogin(result.data);
      if (result.data.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate(result.data.isAdmin ? '/dashboard' : '/workloads');
      }
    },
  });
}

export function useChangePassword() {
  const { isAdmin, clearMustChangePassword } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ChangePasswordCommand) => changePasswordApi(data),
    onSuccess: () => {
      clearMustChangePassword();
      navigate(isAdmin ? '/dashboard' : '/workloads');
    },
  });
}

export function useLogout() {
  const { refreshToken, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => logoutApi({ refresh: refreshToken || '' }),
    onSettled: () => {
      storeLogout();
      navigate('/login');
    },
  });
}
