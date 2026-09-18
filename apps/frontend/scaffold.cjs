const fs = require('fs');
const path = require('path');

const files = {
  'src/stores/authStore.ts': `import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '../types'

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      setToken: (token) => set({ accessToken: token }),
    }),
    { name: 'auth-storage' }
  )
)
`,

  'src/stores/uiStore.ts': `import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        return { theme: newTheme };
      }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    { name: 'ui-storage' }
  )
)
`,

  'src/api/axios.ts': `import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, {
          headers: { Authorization: \`Bearer \${useAuthStore.getState().accessToken}\` }
        });
        useAuthStore.getState().setToken(data.accessToken);
        originalRequest.headers.Authorization = \`Bearer \${data.accessToken}\`;
        return apiClient(originalRequest);
      } catch (err) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);
`,

  'src/hooks/useSocket.ts': `import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useSocket = (queryClient: QueryClient) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '';
    socketRef.current = io(socketUrl, {
      reconnection: true,
    });

    const socket = socketRef.current;

    socket.on('status:update', (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    });

    socket.on('incident:new', (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'incidents'] });
      toast.error(\`New Incident: \${data.summary}\`);
    });

    socket.on('incident:resolved', (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'incidents'] });
      toast.success('Incident resolved');
    });

    socket.on('alert:fired', (data) => {
      toast.warning(\`Alert: \${data.message}\`);
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
};
`,

  'src/App.tsx': `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';
import { useUIStore } from './stores/uiStore';
import AppLayout from './components/layout/AppLayout';

import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import ServicesPage from './pages/ServicesPage';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const theme = useUIStore((state) => state.theme);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors theme={theme} />
    </QueryClientProvider>
  );
}

export default App;
`,

  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`,

  'src/components/layout/AppLayout.tsx': `import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export default function AppLayout() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 flex flex-col min-h-screen transition-all", sidebarOpen ? "md:ml-64" : "md:ml-20")}>
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
`,

  'src/components/layout/Sidebar.tsx': `import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, ServerCog, Bell, Settings, LogOut, Menu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

export default function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/services', label: 'Services', icon: ServerCog },
    { to: '/alerts', label: 'Alerts', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={cn("bg-card border-r fixed inset-y-0 left-0 z-50 flex flex-col transition-all", sidebarOpen ? "w-64" : "w-20 hidden md:flex")}>
      <div className="h-16 flex items-center px-4 border-b">
        <button onClick={toggleSidebar} className="p-2 mr-2 md:block hidden">
          <Menu className="w-5 h-5" />
        </button>
        {sidebarOpen && <span className="font-bold text-lg hidden md:block">Master Dashboard</span>}
      </div>
      <nav className="flex-1 py-4 flex flex-col gap-2 px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname.startsWith(link.to);
          return (
            <Link key={link.to} to={link.to} className={cn("flex items-center gap-3 px-3 py-2 rounded-md transition-colors", active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <Icon className="w-5 h-5" />
              {sidebarOpen && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <button onClick={clearAuth} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors">
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
`,

  'src/components/layout/Header.tsx': `import { Menu, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

export default function Header() {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="md:hidden p-2">
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold text-lg hidden md:block">Dashboard</div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted">
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <UserIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium hidden md:block">{user?.email}</span>
        </div>
      </div>
    </header>
  );
}
`,

  'src/pages/DashboardPage.tsx': `import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle, Server } from 'lucide-react';
import { apiClient } from '../api/axios';
import { DashboardSummary } from '../types';
import { useSocket } from '../hooks/useSocket';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  useSocket(queryClient);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      // Mocking response for frontend-only execution based on API contract
      return {
        totalProjects: 12,
        upProjects: 10,
        downProjects: 1,
        degradedProjects: 1,
        unknownProjects: 0,
        totalServices: 5,
        upServices: 4,
        downServices: 1,
        recentIncidents: []
      } as DashboardSummary;
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-xl border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Projects</p>
            <h3 className="text-2xl font-bold">{data?.totalProjects}</h3>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Up Projects</p>
            <h3 className="text-2xl font-bold">{data?.upProjects}</h3>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Down Projects</p>
            <h3 className="text-2xl font-bold">{data?.downProjects}</h3>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Services</p>
            <h3 className="text-2xl font-bold">{data?.totalServices}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
`,

  'src/pages/ProjectsPage.tsx': `import { useQuery } from '@tanstack/react-query';
import { Project } from '../types';

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return { data: [], total: 0 } as { data: Project[], total: number };
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm">Add Project</button>
      </div>
      
      {data?.data.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card border-dashed">
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground mt-1">Get started by creating a new project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {data?.data.map((project: Project) => (
            <div key={project._id} className="border p-4 rounded-xl">
              {project.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`,

  'src/pages/ServicesPage.tsx': `export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Services</h1>
      <p className="text-muted-foreground">Manage external services and APIs here.</p>
    </div>
  )
}
`,

  'src/pages/LoginPage.tsx': `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login
    setAuth({ id: '1', email, role: 'admin', createdAt: new Date().toISOString() }, 'dummy_token');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 border rounded-2xl bg-card shadow-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Master Dashboard</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-transparent"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-transparent"
              required 
            />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
`
};

for (const [filepath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Created:', filepath);
}
