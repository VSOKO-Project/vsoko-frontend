import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login as loginApi, logout as logoutApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import type { LoginQuery } from '../types';

export function useLogin() {
  const storeLogin = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginQuery) => loginApi(data),
    onSuccess: (result) => {
      storeLogin(result.data);
      navigate(result.data.isAdmin ? '/dashboard' : '/workloads');
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
