import { useState } from 'react';
import { Menu, Moon, Sun, User as UserIcon, LogOut, Key } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '@/api/auth.api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Header() {
  const { theme, toggleTheme, toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      clearAuth();
      toast.info('Logged out');
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="md:hidden p-2 rounded-md hover:bg-muted" aria-label="Toggle sidebar">
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-semibold text-lg hidden md:block tracking-tight">Master Control Center</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none p-1 rounded-full hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-sm">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden md:block mr-1">{user?.email || 'Admin'}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="truncate">{user?.email || 'admin@masterdashboard.com'}</span>
                <Badge variant="outline" className="w-fit capitalize text-[10px]">
                  {user?.role || 'owner'}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  );
}
