import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import AppLayout from './components/layout/AppLayout';

import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import ProjectsPage     from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ServicesPage     from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import SettingsPage     from './pages/SettingsPage';
import AnalyticsPage    from './pages/AnalyticsPage';

// Single shared QueryClient instance — must be OUTSIDE App component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const theme = useUIStore((state) => state.theme);

  // Apply dark class to <html> whenever theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    // QueryClientProvider must wrap EVERYTHING — including BrowserRouter
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — all rendered inside AppLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"      element={<DashboardPage />} />
            <Route path="projects"       element={<ProjectsPage />} />
            <Route path="projects/:id"   element={<ProjectDetailPage />} />
            <Route path="analytics"      element={<AnalyticsPage />} />
            <Route path="services"       element={<ServicesPage />} />
            <Route path="services/:id"   element={<ServiceDetailPage />} />
            <Route path="settings"       element={<SettingsPage />} />
            <Route path="*"              element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Toast notifications — outside BrowserRouter so they always render */}
      <Toaster richColors position="top-right" theme={theme} />
    </QueryClientProvider>
  );
}
