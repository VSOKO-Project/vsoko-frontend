import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const { isAuthenticated, isAdmin, mustChangePassword } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to={isAdmin ? '/dashboard' : '/workloads'} replace />;
  }

  return <Outlet />;
}
