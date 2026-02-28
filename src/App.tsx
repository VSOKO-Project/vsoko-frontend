import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ToastContainer } from './components/ui/Toast';
import { LoginPage } from './pages/LoginPage';
import { WorkloadsPage } from './pages/student/WorkloadsPage';
import { FeedbackFormPage } from './pages/student/FeedbackFormPage';
import { MyFeedbackPage } from './pages/student/MyFeedbackPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { TeachersRatingPage } from './pages/admin/TeachersRatingPage';
import { DisciplinesRatingPage } from './pages/admin/DisciplinesRatingPage';
import { FeedbackListPage } from './pages/admin/FeedbackListPage';
import { TeachersPage } from './pages/admin/TeachersPage';
import { DisciplinesPage } from './pages/admin/DisciplinesPage';
import { CriteriaPage } from './pages/admin/CriteriaPage';
import { SummariesPage } from './pages/admin/SummariesPage';
import { ReportsPage } from './pages/admin/ReportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  const { isAdmin, isAuthenticated } = useAuthStore();
  const defaultPath = isAdmin ? '/dashboard' : '/workloads';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/workloads" element={<WorkloadsPage />} />
          <Route path="/feedback/new" element={<FeedbackFormPage />} />
          <Route path="/my-feedback" element={<MyFeedbackPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/teachers/rating" element={<TeachersRatingPage />} />
            <Route path="/disciplines/rating" element={<DisciplinesRatingPage />} />
            <Route path="/feedback" element={<FeedbackListPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/disciplines" element={<DisciplinesPage />} />
            <Route path="/criteria" element={<CriteriaPage />} />
            <Route path="/summaries" element={<SummariesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to={isAuthenticated ? defaultPath : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
