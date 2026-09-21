import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (axios.isCancel(error)) return false;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: { retry: false },
  },
});

// Cancel pending queries and discard private data before changing users or access.
useAuthStore.subscribe((session, previous) => {
  if (session.sessionVersion !== previous.sessionVersion ||
      (session.mustChangePassword && !previous.mustChangePassword)) {
    queryClient.clear();
  }
});
