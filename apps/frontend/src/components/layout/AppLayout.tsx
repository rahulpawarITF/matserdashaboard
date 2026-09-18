import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';
import { useSocket } from '../../hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';

export default function AppLayout() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const queryClient = useQueryClient();

  // Keep single persistent WebSocket connection active across ALL dashboard pages
  useSocket(queryClient);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-200",
          sidebarOpen ? "md:ml-64" : "md:ml-20"
        )}
      >
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
