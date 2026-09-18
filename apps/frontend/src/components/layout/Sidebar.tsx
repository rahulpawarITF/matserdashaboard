import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, BarChart3, Plug, Settings, LogOut, Menu } from 'lucide-react';
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
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/services', label: 'Services', icon: Plug },
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
