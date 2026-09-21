import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getHomePath, useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const homePath = useAuthStore(getHomePath);
  const location = useLocation();

  if (homePath === '/login' ||
      (homePath === '/change-password' && location.pathname !== homePath) ||
      (homePath !== '/change-password' && location.pathname === '/change-password')) {
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
