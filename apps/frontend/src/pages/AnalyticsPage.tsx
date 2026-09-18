import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics.api';
import { projectsApi } from '@/api/projects.api';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  CalendarDays,
  Flame,
  Globe,
  ExternalLink,
  ArrowUpRight,
  Database,
  ShieldCheck,
  RefreshCw,
  Percent,
  BarChart3,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { pollingInterval } = useSystemSettings();

  // 1. Fetch all projects for the selector & quick switcher
  const { data: projectsRes, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', 'analytics-selector'],
    queryFn: () => projectsApi.list({ limit: 50 }).then((r) => r.data),
    refetchInterval: pollingInterval,
  });

  const rawProjects: any[] = Array.isArray(projectsRes)
    ? projectsRes
    : Array.isArray(projectsRes?.data)
    ? projectsRes.data
    : Array.isArray(projectsRes?.projects)
    ? projectsRes.projects
    : [];

  // Enriched projects sorted by active today
  const projectsList = useMemo(() => {
    return [...rawProjects]
      .map((p) => {
        const registered = p.registeredUsers ?? p.userCount ?? 0;
        const activeToday = p.activeUsersToday ?? p.todayVisitors ?? 0;
        const activeWeek = p.activeUsersWeek ?? p.weekVisitors ?? 0;
        const activityRate = registered > 0 ? (activeToday / registered) * 100 : 0;
        const primaryUrl = p.urls?.[0]?.url || p.documentationUrl || '';

        return {
          ...p,
          registered,
          activeToday,
          activeWeek,
          activityRate,
          primaryUrl,
        };
      })
      .sort((a, b) => b.activeToday - a.activeToday || b.registered - a.registered);
  }, [rawProjects]);

  // Active selected project (defaults to the most active project)
  const activeProjectId = selectedProjectId || projectsList[0]?._id;
  const currentProject = projectsList.find((p) => p._id === activeProjectId) || projectsList[0];

  // 2. Fetch detailed analytics for ONLY the currently selected project
  const { data: projectAnalyticsRes, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics', 'project', activeProjectId, range],
    queryFn: () =>
      activeProjectId
        ? analyticsApi.getProjectAnalytics(activeProjectId, range).then((r) => r.data)
        : null,
    enabled: !!activeProjectId,
    refetchInterval: pollingInterval,
  });

  const analytics = (projectAnalyticsRes as any)?.data || projectAnalyticsRes;

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      ]);
      toast.success('Analytics refreshed for ' + (currentProject?.name || 'project'));
    } catch {
      toast.error('Failed to refresh analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute display metrics for the selected project
  const registeredCount = analytics?.registeredUsers || currentProject?.registered || 0;
  const userCount = analytics?.userCount ?? currentProject?.userCount ?? registeredCount;
  const adminCount = analytics?.adminCount ?? currentProject?.adminCount ?? 0;
  const activeToday = analytics?.dailyUsers ?? currentProject?.activeToday ?? 0;
  const activeWeek = analytics?.weeklyUsers ?? currentProject?.activeWeek ?? 0;
  const activeMonth = analytics?.monthlyUsers ?? registeredCount;
  const activityRate =
    registeredCount > 0 ? ((activeToday / registeredCount) * 100).toFixed(1) : '0.0';

  // Format chart time labels
  const formatChartDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (range === '24h' && dateStr.includes(' ')) {
      return dateStr.split(' ')[1];
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = analytics?.timeline || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Page Header with Project Switcher & Refresh */}
      <PageHeader
        title="Project User Analytics"
        description="Real-time user engagement, registered accounts, and database activity for the selected project."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {currentProject && (
            <Button
              size="sm"
              className="gap-1.5 h-8 text-xs font-semibold"
              onClick={() => navigate(`/projects/${currentProject._id}`)}
            >
              Manage Project <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Prominent Project Selector Banner */}
      <Card className="border-primary/30 bg-card shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Project Picker Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                Select Project:
              </span>
              <Select
                value={activeProjectId || ''}
                onValueChange={(val) => setSelectedProjectId(val)}
              >
                <SelectTrigger className="w-full sm:w-[320px] font-semibold text-sm h-9 bg-background">
                  <SelectValue placeholder="Choose project to view analytics..." />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {projectsList.map((p) => (
                    <SelectItem key={p._id} value={p._id} className="cursor-pointer py-2">
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="font-semibold text-foreground">{p.name}</span>
                        <div className="flex items-center gap-1.5 ml-auto">
                          {p.activeToday > 0 && (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {p.activeToday} active
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {p.registered.toLocaleString()} users
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Right: Selected Project Live Quick Info */}
            {currentProject && (
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge status={currentProject.currentStatus} size="sm" />
                <Badge variant="outline" className="text-xs capitalize font-mono">
                  {currentProject.environment}
                </Badge>
                {currentProject.primaryUrl && (
                  <a
                    href={currentProject.primaryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-mono transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {(() => {
                      try {
                        return new URL(currentProject.primaryUrl).hostname;
                      } catch {
                        return currentProject.primaryUrl;
                      }
                    })()}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {currentProject.latestResponseTimeMs > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                    {currentProject.latestResponseTimeMs}ms latency
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick-Switch Pill Row for Fast Navigation */}
          <div className="mt-3 pt-3 border-t flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium mr-1">
              Top Active:
            </span>
            {projectsList.slice(0, 7).map((p) => {
              const isSelected = p._id === activeProjectId;
              return (
                <button
                  key={p._id}
                  onClick={() => setSelectedProjectId(p._id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{p.name}</span>
                  {p.activeToday > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 rounded-full ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                      }`}
                    >
                      {p.activeToday}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area: Selected Project Analytics Only */}
      {isLoadingProjects || (isLoadingAnalytics && !analytics) ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : currentProject ? (
        <div className="space-y-6">
          {/* Section Header with Project Identity & Range Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{currentProject.name}</h2>
                <Badge variant="secondary" className="text-xs">
                  {currentProject.category || 'Web Application'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displaying authentic production user metrics from database collection: <code className="font-mono text-foreground font-semibold">{analytics?.userSource || currentProject.name}</code>
              </p>
            </div>

            {/* Timeframe Selector Pills */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded-md transition-colors text-xs font-medium ${
                    range === r
                      ? 'bg-background shadow-xs text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === '24h' ? 'Last 24 Hours' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Focused Hero KPI Metric Cards for THIS Selected Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Verified Registered Accounts */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Registered DB Accounts
                  </span>
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                  {registeredCount.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>Users: <strong className="text-foreground font-mono">{userCount.toLocaleString()}</strong></span>
                  {adminCount > 0 && (
                    <span>Admins: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{adminCount}</strong></span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Active Users Today (Last 24 Hours) */}
            <Card className="border-emerald-500/30 bg-emerald-500/[0.04] shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Active Today (24h)
                    </span>
                  </div>
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {activeToday.toLocaleString()}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Real accounts active in last 24h
                </p>
              </CardContent>
            </Card>

            {/* 3. Active Users This Week (7 Days) */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Active This Week (7d)
                  </span>
                  <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                  {(activeWeek > 0 ? activeWeek : activeToday).toLocaleString()}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Active in 7d{activeMonth > 0 ? ` • ${activeMonth.toLocaleString()} monthly` : ''}
                </p>
              </CardContent>
            </Card>

            {/* 4. Today's Activity Rate (%) */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Today Activity Rate
                  </span>
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">
                  {activityRate}%
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, parseFloat(activityRate) * 4)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visual Activity Trend Chart for Selected Project */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  {currentProject.name} — Activity & Traffic Trend ({range})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real daily user activity recorded from live database transactions
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {chartData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 border rounded-lg border-dashed bg-muted/10">
                  <Database className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <p className="font-semibold text-foreground text-sm">
                    No active user transactions recorded in this time window.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {activeToday > 0
                      ? `${activeToday} users were active today in ${currentProject.name}.`
                      : 'As users log in or perform transactions in this project, activity records will be tracked automatically.'}
                  </p>
                </div>
              ) : (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="activeUsersGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis
                        dataKey="time"
                        tickFormatter={formatChartDate}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                                <p className="font-semibold text-foreground">{label}</p>
                                <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                  Active Users: {payload[0].value?.toLocaleString()}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="uniqueVisitors"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#activeUsersGrad)"
                        name="Active Users"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Two Columns: Day-by-Day Historical Breakdown + Database Intelligence Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day-by-Day Historical Activity Table */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  Day-by-Day User Activity Breakdown
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Recent daily activity log for {currentProject.name}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {analytics?.dayByDay && analytics.dayByDay.length > 0 ? (
                  <div className="divide-y divide-border/50 text-xs">
                    <div className="grid grid-cols-3 p-2.5 font-semibold text-[11px] text-muted-foreground bg-muted/40">
                      <span>Date & Day</span>
                      <span className="text-right">Active Users</span>
                      <span className="text-right">Platform Access</span>
                    </div>
                    {analytics.dayByDay.map((day: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-3 p-3 items-center hover:bg-muted/20 transition-colors">
                        <div>
                          <span className="font-mono font-semibold text-foreground block">{day.date}</span>
                          <span className="text-[11px] text-muted-foreground">{day.dayName}</span>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {(day.uniqueVisitors ?? day.views ?? 0).toLocaleString()}
                        </div>
                        <div className="text-right font-mono text-[11px] text-muted-foreground">
                          {day.mobilePercent ? `${day.mobilePercent}% Mobile` : 'Responsive Web'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No historical day-by-day records found for this period.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Intelligence & Source Transparency */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Database Collections & Zero-Change Architecture
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  How Master Dashboard safely monitors {currentProject.name}
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        Target Database
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {analytics?.registeredUserSource?.split(' ')[0] || currentProject.name}
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] text-blue-500 border-blue-500/30">
                      147.79.70.177:27017
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                        User Accounts Collection
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {analytics?.userSource || 'users'}
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {userCount.toLocaleString()} docs
                    </span>
                  </div>

                  {adminCount > 0 && (
                    <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Admin Accounts Collection
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {analytics?.adminSource || 'admins'}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {adminCount.toLocaleString()} docs
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 text-[11px] space-y-1.5 text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Strict Production Safeguards Active
                  </div>
                  <p className="leading-relaxed">
                    Zero project code changes or external scripts required. All queries use <code className="font-mono text-foreground">secondaryPreferred</code> read preferences with strict 3-second hard timeouts and a 2-minute memory cache, guaranteeing 0 impact on your live servers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick-Switch Cards Grid to Easily Switch to Any Other Project */}
          <div className="pt-4 border-t space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Switch Project Analytics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {projectsList.map((p) => {
                const isSelected = p._id === activeProjectId;
                return (
                  <div
                    key={p._id}
                    onClick={() => setSelectedProjectId(p._id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                        : 'border-border/60 bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground truncate flex items-center justify-between">
                      <span className="truncate">{p.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                      <span className="text-muted-foreground">{p.registered.toLocaleString()} users</span>
                      {p.activeToday > 0 && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {p.activeToday} live
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-muted-foreground text-sm border rounded-xl bg-card">
          No projects available.
        </div>
      )}
    </div>
  );
}
