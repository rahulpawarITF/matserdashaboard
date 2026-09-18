import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemApi } from '@/api/system.api';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { SystemSettings } from '@/types';
import {
  Loader2,
  Activity,
  Database,
  Clock,
  Shield,
  Sliders,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  const { data: settingsRes, isLoading } = useQuery({
    queryKey: ['system', 'settings'],
    queryFn: () => systemApi.getSettings().then((res) => res.data),
  });

  const settings = (settingsRes as any)?.data || settingsRes;

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: () => systemApi.updateSettings(formData),
    onSuccess: () => {
      toast.success('System settings saved and applied dynamically at runtime');
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update settings');
    },
  });

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16 animate-in fade-in duration-300">
      <PageHeader
        title="System Settings & Operational Parameters"
        description="Configure dynamic intervals, timeouts, and production database synchronization. All settings apply dynamically at runtime with zero downtime."
      />

      {/* ─── 1. Heartbeat Engine & Pulse Timeouts ─────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Heartbeat Engine &amp; Uptime Pulse Timeouts</CardTitle>
              <CardDescription>
                Controls how frequently websites are checked and when requests time out.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setting: Safe Pulse Interval */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="heartbeatIntervalSeconds" className="text-sm font-semibold text-foreground">
                    Safe Pulse Interval (Seconds)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Recommended: 60s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  How often the system checks your websites in the background during normal operation.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="heartbeatIntervalSeconds"
                  type="number"
                  min={10}
                  max={300}
                  value={formData.heartbeatIntervalSeconds ?? 60}
                  onChange={(e) =>
                    setFormData({ ...formData, heartbeatIntervalSeconds: parseInt(e.target.value) || 60 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 10s &ndash; 300s</p>
              </div>
            </div>

            {/* Setting: Rapid Triage Pulse */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="heartbeatLiveIntervalSeconds" className="text-sm font-semibold text-foreground">
                    Diagnostic Pulse (Rapid Outage Triage)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Recommended: 30s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  How fast the system re-checks broken sites to detect immediately when they recover.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="heartbeatLiveIntervalSeconds"
                  type="number"
                  min={5}
                  max={60}
                  value={formData.heartbeatLiveIntervalSeconds ?? 30}
                  onChange={(e) =>
                    setFormData({ ...formData, heartbeatLiveIntervalSeconds: parseInt(e.target.value) || 30 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 5s &ndash; 60s</p>
              </div>
            </div>

            {/* Setting: HTTP Check Timeout */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="httpCheckTimeoutMs" className="text-sm font-semibold text-foreground">
                    HTTP Request Timeout Limit (ms)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Recommended: 6000ms
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Maximum wait time for a website to respond before marking it down as unreachable.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="httpCheckTimeoutMs"
                  type="number"
                  min={1000}
                  max={30000}
                  step={500}
                  value={formData.httpCheckTimeoutMs ?? 6000}
                  onChange={(e) =>
                    setFormData({ ...formData, httpCheckTimeoutMs: parseInt(e.target.value) || 6000 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 1000ms &ndash; 30000ms</p>
              </div>
            </div>

            {/* Setting: Degraded Latency Threshold */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="httpDegradedThresholdMs" className="text-sm font-semibold text-foreground">
                    Degraded / Slowness Warning Threshold (ms)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Recommended: 4000ms
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Flags a website as slow (yellow degraded badge) if it takes longer than this to respond.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="httpDegradedThresholdMs"
                  type="number"
                  min={500}
                  max={10000}
                  step={250}
                  value={formData.httpDegradedThresholdMs ?? 4000}
                  onChange={(e) =>
                    setFormData({ ...formData, httpDegradedThresholdMs: parseInt(e.target.value) || 4000 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 500ms &ndash; 10000ms</p>
              </div>
            </div>

            {/* Setting: Manual Check Timeout */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between md:col-span-2">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="manualCheckTimeoutMs" className="text-sm font-semibold text-foreground">
                    On-Demand &quot;Check Now&quot; Button Timeout (ms)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Recommended: 8000ms
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Maximum wait time when manually clicking &quot;Check Now&quot; on any project card.
                </p>
              </div>
              <div className="pt-2 max-w-sm">
                <Input
                  id="manualCheckTimeoutMs"
                  type="number"
                  min={1000}
                  max={30000}
                  step={500}
                  value={formData.manualCheckTimeoutMs ?? 8000}
                  onChange={(e) =>
                    setFormData({ ...formData, manualCheckTimeoutMs: parseInt(e.target.value) || 8000 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 1000ms &ndash; 30000ms</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Production Database Sync (147.79.70.177) ───────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Production Database Sync &amp; User Counts</CardTitle>
              <CardDescription>
                Safely syncs real registered user and admin numbers from your production database.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Setting: Production Sync Interval */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="productionSyncIntervalSeconds" className="text-sm font-semibold text-foreground">
                    DB Sync Interval (Seconds)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Recommended: 60s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  How often to refresh authentic registered user and admin counts from your live database.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="productionSyncIntervalSeconds"
                  type="number"
                  min={10}
                  max={600}
                  value={formData.productionSyncIntervalSeconds ?? 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productionSyncIntervalSeconds: parseInt(e.target.value) || 60,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 10s &ndash; 600s</p>
              </div>
            </div>

            {/* Setting: Prod DB Query Timeout */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="prodDbTimeoutMs" className="text-sm font-semibold text-foreground">
                    Safety Query Timeout (ms)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Recommended: 8000ms
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Prevents database slowdowns by canceling user count queries if the database is busy.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="prodDbTimeoutMs"
                  type="number"
                  min={2000}
                  max={30000}
                  step={500}
                  value={formData.prodDbTimeoutMs ?? 8000}
                  onChange={(e) =>
                    setFormData({ ...formData, prodDbTimeoutMs: parseInt(e.target.value) || 8000 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 2000ms &ndash; 30000ms</p>
              </div>
            </div>

            {/* Setting: Cache TTL */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="registeredUsersCacheTtlSeconds" className="text-sm font-semibold text-foreground">
                    In-Memory Cache TTL (Seconds)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Recommended: 120s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Stores fetched user numbers in memory so pages load instantly without querying the live database again.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="registeredUsersCacheTtlSeconds"
                  type="number"
                  min={15}
                  max={600}
                  value={formData.registeredUsersCacheTtlSeconds ?? 120}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registeredUsersCacheTtlSeconds: parseInt(e.target.value) || 120,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 15s &ndash; 600s</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. Realtime Analytics & Polling ─────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Realtime Analytics &amp; Browser Auto-Refresh</CardTitle>
              <CardDescription>
                Controls browser page refresh intervals and active visitor time windows.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Setting: Browser Polling Rate */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="dashboardPollingIntervalSeconds" className="text-sm font-semibold text-foreground">
                    Browser Auto-Refresh Rate (Seconds)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    Recommended: 60s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  How often open dashboard tabs refresh their numbers and graphs automatically.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="dashboardPollingIntervalSeconds"
                  type="number"
                  min={10}
                  max={300}
                  value={formData.dashboardPollingIntervalSeconds ?? 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dashboardPollingIntervalSeconds: parseInt(e.target.value) || 60,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 10s &ndash; 300s</p>
              </div>
            </div>

            {/* Setting: Active User Window */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="activeVisitorWindowMinutes" className="text-sm font-semibold text-foreground">
                    Active User Session Window (Minutes)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Recommended: 5 min
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Considers a user currently active if they logged in or performed an action within this time.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="activeVisitorWindowMinutes"
                  type="number"
                  min={1}
                  max={30}
                  value={formData.activeVisitorWindowMinutes ?? 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      activeVisitorWindowMinutes: parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 1 min &ndash; 30 min</p>
              </div>
            </div>

            {/* Setting: Dashboard Summary Cache */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="dashboardStatsCacheSeconds" className="text-sm font-semibold text-foreground">
                    Summary Stats Backend Cache (Seconds)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Recommended: 30s
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Caches top overview counters in memory for instant dashboard loading across multiple admins.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="dashboardStatsCacheSeconds"
                  type="number"
                  min={5}
                  max={300}
                  value={formData.dashboardStatsCacheSeconds ?? 30}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dashboardStatsCacheSeconds: parseInt(e.target.value) || 30,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 5s &ndash; 300s</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. General Defaults & Data Retention ────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Defaults &amp; Data Retention Lifecycle</CardTitle>
              <CardDescription>
                Configures project creation defaults and how long history logs are stored.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setting: Default Check Interval */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="defaultCheckIntervalMinutes" className="text-sm font-semibold text-foreground">
                    Default Project Check Rate (Minutes)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Recommended: 5 min
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  The default monitoring interval pre-selected when creating a new project.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="defaultCheckIntervalMinutes"
                  type="number"
                  min={1}
                  max={1440}
                  value={formData.defaultCheckIntervalMinutes ?? 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultCheckIntervalMinutes: parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 1 min &ndash; 1440 min</p>
              </div>
            </div>

            {/* Setting: Data Retention Days */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label htmlFor="dataRetentionDays" className="text-sm font-semibold text-foreground">
                    Health Check Logs Retention (Days)
                  </Label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Recommended: 90 days
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  How many days to keep uptime history before automatically deleting older logs.
                </p>
              </div>
              <div className="pt-2">
                <Input
                  id="dataRetentionDays"
                  type="number"
                  min={1}
                  max={3650}
                  value={formData.dataRetentionDays ?? 90}
                  onChange={(e) =>
                    setFormData({ ...formData, dataRetentionDays: parseInt(e.target.value) || 90 })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">Allowed range: 1 &ndash; 3650 days</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-5 pb-5 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sliders className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Settings apply dynamically in real time across the backend and all open browser tabs.</span>
          </div>
          <Button
            size="lg"
            onClick={() => updateSettings.mutate()}
            disabled={updateSettings.isPending}
            className="w-full sm:w-auto font-semibold px-6 shadow"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving &amp; Applying...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Save &amp; Apply All Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
