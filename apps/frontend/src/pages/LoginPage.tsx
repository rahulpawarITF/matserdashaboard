import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@masterdashboard.local');
  const [password, setPassword] = useState('Admin@1234');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await authApi.login(email, password);
      // Because axios interceptor unwraps response.data.data, response.data has { accessToken, user }
      const payload = response.data as any;
      const accessToken = payload?.accessToken || payload?.data?.accessToken;
      const user = payload?.user || payload?.data?.user || {
        id: '1',
        email,
        role: payload?.role || 'owner',
        createdAt: new Date().toISOString(),
      };

      if (!accessToken) {
        throw new Error('No access token returned from server.');
      }

      setAuth(user, accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to log in. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md p-8 border rounded-2xl bg-card shadow-lg animate-in fade-in duration-300">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mb-3 shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Master Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage projects and services</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@masterdashboard.local"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground text-center">
          <p className="font-medium text-foreground mb-1">Default credentials (from seed):</p>
          <p>Email: <code className="bg-muted px-1 py-0.5 rounded">admin@masterdashboard.local</code></p>
          <p className="mt-0.5">Password: <code className="bg-muted px-1 py-0.5 rounded">Admin@1234</code></p>
        </div>
      </div>
    </div>
  );
}
