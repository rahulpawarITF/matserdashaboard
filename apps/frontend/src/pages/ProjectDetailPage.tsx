import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects.api';
import { servicesApi } from '@/api/services.api';
import { analyticsApi } from '@/api/analytics.api';
import { dashboardApi } from '@/api/dashboard.api';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckNowButton } from '@/components/shared/CheckNowButton';
import { ResponseTimeChart } from '@/components/shared/ResponseTimeChart';
import { UptimeBar } from '@/components/shared/UptimeBar';
import { IncidentFeed } from '@/components/dashboard/IncidentFeed';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditProjectModal } from '@/components/projects/EditProjectModal';
import { ProjectCredentialsCard } from '@/components/projects/ProjectCredentialsCard';
import { AddServiceModal } from '@/components/services/AddServiceModal';
import { TrackingSnippetModal } from '@/components/analytics/TrackingSnippetModal';
import { AnalyticsOverviewCards } from '@/components/analytics/AnalyticsOverviewCards';
import { TrafficChart } from '@/components/analytics/TrafficChart';
import { TopPagesTable } from '@/components/analytics/TopPagesTable';
import { ReferrerList } from '@/components/analytics/ReferrerList';
import { DeviceBreakdownChart } from '@/components/analytics/DeviceBreakdownChart';
import { DayByDayTable } from '@/components/analytics/DayByDayTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Edit2,
  Trash2,
  ArrowLeft,
  Plug,
  Plus,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Server,
  ArrowUpRight,
  Code,
  BarChart3,
  Activity,
  RefreshCw,
  Clock,
  Users,
  Database,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'health' | 'analytics'>('health');
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | '7d' | '30d'>('24h');
  const { pollingInterval } = useSystemSettings();

  const { data: projectRes, isLoading: isLoadingProject } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: pollingInterval,
  });

  const { data: analyticsRes, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics', 'project', id, analyticsRange],
    queryFn: () => analyticsApi.getProjectAnalytics(id!, analyticsRange).then((r) => r.data),
    enabled: !!id,
    refetchInterval: pollingInterval,
  });

  const { data: uptimeRes } = useQuery({
    queryKey: ['projects', id, 'uptime'],
    queryFn: () => projectsApi.getUptime(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: pollingInterval,
  });

  const { data: resultsRes } = useQuery({
    queryKey: ['projects', id, 'results'],
    queryFn: () => projectsApi.getResults(id!, { limit: 50 }).then((r) => r.data),
    enabled: !!id,
    refetchInterval: pollingInterval,
  });

  // Timeframe and status filters for Project Recent Checks Log
  const [checkTimeframe, setCheckTimeframe] = useState<'today' | 'yesterday' | '7d' | '15d' | '30d'>('today');
  const [checkStatusFilter, setCheckStatusFilter] = useState<'all' | 'up' | 'down' | 'degraded'>('all');
  const [checkPage, setCheckPage] = useState(1);

  const {
    data: filteredChecksRes,
    isLoading: isLoadingFilteredChecks,
    isFetching: isFetchingChecks,
    refetch: refetchChecks,
  } = useQuery({
    queryKey: ['project-filtered-checks', id, checkTimeframe, checkStatusFilter, checkPage],
    queryFn: () =>
      dashboardApi
        .getRecentChecks({
          timeframe: checkTimeframe,
          projectId: id,
          status: checkStatusFilter !== 'all' ? checkStatusFilter : undefined,
          page: checkPage,
          limit: 15,
        })
        .then((r) => r.data),
    enabled: !!id,
    refetchInterval: pollingInterval,
  });

  const { data: outageCorrRes } = useQuery({
    queryKey: ['project-outage-correlation', checkTimeframe],
    queryFn: () => dashboardApi.getOutageCorrelation({ timeframe: checkTimeframe }).then((r) => r.data),
    refetchInterval: pollingInterval,
  });

  const { data: incidentsRes } = useQuery({
    queryKey: ['projects', id, 'incidents'],
    queryFn: () => projectsApi.getIncidents(id!).then((r) => r.data),
    enabled: !!id,
  });

  // Fetch all services to find those linked to this project
  const { data: allServicesRes } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.list().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id!),
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/projects');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete project');
    },
  });

  if (isLoadingProject) return <LoadingSpinner fullPage />;
  const project = (projectRes as any)?.data || projectRes;
  if (!project) return <div className="p-6">Project not found</div>;

  const projectAnalytics = (analyticsRes as any)?.data || analyticsRes;
  const uptime = (uptimeRes as any)?.data || uptimeRes;
  const resultsData = Array.isArray(resultsRes)
    ? resultsRes
    : Array.isArray((resultsRes as any)?.data)
    ? (resultsRes as any).data
    : Array.isArray((resultsRes as any)?.results)
    ? (resultsRes as any).results
    : [];

  const incidentsData = Array.isArray(incidentsRes)
    ? incidentsRes
    : Array.isArray((incidentsRes as any)?.data)
    ? (incidentsRes as any).data
    : [];

  const allServices = Array.isArray(allServicesRes)
    ? allServicesRes
    : Array.isArray((allServicesRes as any)?.data)
    ? (allServicesRes as any).data
    : [];

  // Find services linked to this project - combining allServices with populated project.linkedServices
  const linkedServicesMap = new Map<string, any>();

  // 1. Direct project services (populated from project get API and live socket synchronizer)
  const projectDirectServices = Array.isArray(project.linkedServices)
    ? project.linkedServices
    : Array.isArray(project.linkedServiceIds)
    ? project.linkedServiceIds.filter((s: any) => typeof s === 'object' && s !== null)
    : [];

  for (const svc of projectDirectServices) {
    if (svc && svc._id) {
      linkedServicesMap.set(String(svc._id), svc);
    }
  }

  // 2. Overlay or find matches from allServices (kept fresh by React Query socket updates)
  for (const svc of allServices) {
    const isLinked =
      svc.linkedProjectIds?.some((p: any) => String(p?._id || p) === id) ||
      project.linkedServiceIds?.some((ls: any) => String(ls?._id || ls) === String(svc._id)) ||
      linkedServicesMap.has(String(svc._id));

    if (isLinked) {
      linkedServicesMap.set(String(svc._id), svc);
    }
  }

  const linkedServices = Array.from(linkedServicesMap.values());
  const downServices = linkedServices.filter((s: any) => s.currentStatus === 'down');
  const degradedServices = linkedServices.filter((s: any) => s.currentStatus === 'degraded');
  const hasServiceOutage = downServices.length > 0;
  const hasServiceDegraded = degradedServices.length > 0;

  const h24 = uptime?.h24 ?? uptime?.['24h'] ?? 100;
  const d7 = uptime?.d7 ?? uptime?.['7d'] ?? 100;
  const d30 = uptime?.d30 ?? uptime?.['30d'] ?? 100;

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      default:
        return <Server className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer hover:text-foreground w-fit transition-colors"
        onClick={() => navigate('/projects')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </div>

      <PageHeader title={project.name} description={project.description}>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSnippetOpen(true)} className="gap-1.5">
            <Code className="w-4 h-4" /> Tracking Code
          </Button>
          <CheckNowButton targetId={project._id} targetType="project" variant="outline" />
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-4 items-center">
        <StatusBadge status={project.currentStatus} />
        <Badge variant="outline" className="capitalize">
          {project.environment}
        </Badge>
        <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-2.5">
          <Users className="w-3.5 h-3.5" />
          <span>{(project.registeredUsers ?? projectAnalytics?.registeredUsers ?? 0).toLocaleString()} Registered Accounts</span>
          <span className="text-[10px] text-muted-foreground font-normal">({project.registeredUserSource || projectAnalytics?.registeredUserSource || 'Database'})</span>
        </Badge>
        <div className="text-sm text-muted-foreground">
          Checked{' '}
          {project.lastCheckedAt
            ? formatDistanceToNow(new Date(project.lastCheckedAt)) + ' ago'
            : 'Never checked'}
        </div>
        {project.documentationUrl && (
          <a
            href={project.documentationUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Docs <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Project Credentials & Access Information Hub */}
      <ProjectCredentialsCard
        notes={project.ownerNotes}
        projectName={project.name}
      />

      {/* Critical Integration Outage Alert Banner */}
      {hasServiceOutage && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 mt-0.5 shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Critical Third-Party Service Outage Affecting {project.name}</span>
                <Badge variant="destructive" className="text-[10px] uppercase font-mono px-1.5 py-0">
                  {downServices.length} Outage{downServices.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="text-xs mt-1 text-red-600/90 dark:text-red-300/90 leading-relaxed">
                <strong>{downServices.map((s: any) => s.name).join(', ')}</strong> is currently <strong>DOWN</strong>. 
                Features on {project.name} depending on this service (e.g. OTP verification, SMS notifications, WhatsApp messaging, payment processing) will fail.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {downServices.map((s: any) => (
              <Button
                key={s._id}
                variant="destructive"
                size="sm"
                className="text-xs h-8 gap-1 shadow-xs cursor-pointer"
                onClick={() => navigate(`/services/${s._id}`)}
              >
                Inspect {s.name} <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Linked Third-Party Services Section */}
      <Card className={`transition-all duration-300 ${
        hasServiceOutage
          ? 'border-red-500/60 bg-red-500/[0.02] shadow-md shadow-red-500/5'
          : hasServiceDegraded
          ? 'border-amber-500/60 bg-amber-500/[0.02]'
          : 'border-primary/20 bg-card'
      }`}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className={`w-4 h-4 ${hasServiceOutage ? 'text-red-500' : 'text-primary'}`} />
              <span>Linked Third-Party Integrations ({linkedServices.length})</span>
              {hasServiceOutage && (
                <Badge variant="destructive" className="text-[10px] uppercase font-mono py-0 px-1.5 animate-pulse">
                  Outage Active
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              WhatsApp bot, MSG99 SMS, payment gateways, and external APIs connected to {project.name}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddServiceOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add / Link Service
          </Button>
        </CardHeader>
        <CardContent>
          {linkedServices.length === 0 ? (
            <div className="p-4 border rounded-lg bg-muted/20 text-center border-dashed text-xs text-muted-foreground">
              No third-party integrations linked yet.{' '}
              <button
                className="text-primary hover:underline font-medium ml-1"
                onClick={() => setAddServiceOpen(true)}
              >
                Link WhatsApp Bot or MSG99
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {linkedServices.map((service: any) => {
                const isDown = service.currentStatus === 'down';
                const isDegraded = service.currentStatus === 'degraded';

                return (
                  <div
                    key={service._id}
                    className={`p-3 border rounded-lg transition-all flex flex-col justify-between gap-2 ${
                      isDown
                        ? 'border-red-500/60 bg-red-500/10 dark:bg-red-500/15'
                        : isDegraded
                        ? 'border-amber-500/60 bg-amber-500/10 dark:bg-amber-500/15'
                        : 'border-border/80 bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-md ${isDown ? 'bg-red-500/20 text-red-600' : 'bg-muted/60'}`}>
                          {getServiceIcon(service.type)}
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                            <span className={isDown ? 'text-red-700 dark:text-red-300 font-bold' : ''}>
                              {service.name}
                            </span>
                            <button
                              onClick={() => navigate(`/services/${service._id}`)}
                              className="text-muted-foreground hover:text-primary"
                              title="View Service Details"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {service.provider} • {service.statusEndpoint}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <StatusBadge status={service.currentStatus} size="sm" />
                        <CheckNowButton
                          targetId={service._id}
                          targetType="service"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                        />
                      </div>
                    </div>

                    {isDown && service.lastErrorMessage && (
                      <div className="text-[11px] font-mono text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 truncate">
                        <strong>Error:</strong> {service.lastErrorMessage}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Switcher: Health vs User Analytics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full sm:w-[380px] grid-cols-2">
            <TabsTrigger value="health" className="gap-2 text-xs">
              <Activity className="w-3.5 h-3.5" /> Endpoints & Health
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 text-xs">
              <BarChart3 className="w-3.5 h-3.5" /> Traffic & Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {projectAnalytics && (
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{(projectAnalytics.dailyUsers || projectAnalytics.realtimeActive || 0).toLocaleString()} active users today</span>
          </div>
        )}
      </div>

      {activeTab === 'analytics' ? (
        isLoadingAnalytics && !projectAnalytics ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-6">
            {/* 1. Metric Overview Cards */}
            <AnalyticsOverviewCards
              realtimeActive={projectAnalytics?.realtimeActive || 0}
              registeredUsers={projectAnalytics?.registeredUsers || project.registeredUsers || project.userCount || 0}
              registeredUserSource={projectAnalytics?.registeredUserSource || project.registeredUserSource}
              dailyUsers={projectAnalytics?.dailyUsers}
              weeklyUsers={projectAnalytics?.weeklyUsers}
              monthlyUsers={projectAnalytics?.monthlyUsers}
              totalViews={projectAnalytics?.totalViews || 0}
              uniqueVisitors={projectAnalytics?.uniqueVisitors || 0}
              pagesPerVisit={projectAnalytics?.pagesPerVisit || 0}
              rangeLabel={
                analyticsRange === '24h'
                  ? 'Last 24 Hours'
                  : analyticsRange === '7d'
                  ? 'Last 7 Days'
                  : 'Last 30 Days'
              }
            />

            {/* 2. User Activity Trend Chart */}
            <TrafficChart
              data={projectAnalytics?.timeline || []}
              range={analyticsRange}
              onRangeChange={setAnalyticsRange}
              title={`${project.name} — User Activity Trend`}
            />

            {/* 3. Day-by-Day Historical Breakdown Table (if available) */}
            {projectAnalytics?.dayByDay && projectAnalytics.dayByDay.length > 0 && (
              <DayByDayTable
                days={projectAnalytics.dayByDay}
                projectName={project.name}
              />
            )}

            {/* 4. Production Database Verification & Account Architecture Card */}
            <Card className="border-border/60 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  Production Database Activity & Records Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-muted/20">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium block">
                      Target Database
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                      {projectAnalytics?.registeredUserSource?.split(' ')[0] || 'MongoDB'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Host: 147.79.70.177:27017</span>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium block">
                      Users Collection
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5 block">
                      {(projectAnalytics?.userCount ?? project.userCount ?? 0).toLocaleString()} Users
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate block">
                      {projectAnalytics?.userSource || 'users'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border bg-muted/20">
                    <span className="text-[11px] text-muted-foreground uppercase font-medium block">
                      Admins Collection
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-0.5 block">
                      {(projectAnalytics?.adminCount ?? 0).toLocaleString()} Admins
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate block">
                      {projectAnalytics?.adminSource || 'admins'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 text-[11px] flex items-center gap-2.5 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Zero code modification mode: Master Dashboard connects strictly read-only (<code className="font-mono text-foreground">secondaryPreferred</code>, 3s timeout) to monitor real user activity via timestamp indices (<code className="font-mono text-foreground">updatedAt</code>, <code className="font-mono text-foreground">createdAt</code>).
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 5. Web Beacon & Pageview Breakdown (Only shown if pageview beacons are active) */}
            {((projectAnalytics?.totalViews || 0) > 0 || (projectAnalytics?.topPaths?.length || 0) > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <TopPagesTable
                  paths={projectAnalytics?.topPaths || []}
                  totalViews={projectAnalytics?.totalViews || 0}
                />
                <ReferrerList
                  referrers={projectAnalytics?.topReferrers || []}
                  totalViews={projectAnalytics?.totalViews || 0}
                />
                <DeviceBreakdownChart
                  devices={projectAnalytics?.devices || { desktop: 0, mobile: 0, tablet: 0 }}
                  browsers={projectAnalytics?.browsers || []}
                  os={projectAnalytics?.os || []}
                  totalViews={projectAnalytics?.totalViews || 0}
                />
              </div>
            )}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monitored Endpoints ({project.urls?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.urls?.map((url: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3.5 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                    >
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {url.label}
                          {url.isHealthCheckTarget && (
                            <Badge variant="secondary" className="text-[10px] py-0 font-normal">
                              Active Check
                            </Badge>
                          )}
                        </div>
                        <a
                          href={url.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 mt-1 font-mono break-all"
                        >
                          {url.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Expected: {url.expectedStatusCode || 200}</div>
                        {url.expectedBodyContains && (
                          <div className="truncate max-w-[150px]">Keyword: {url.expectedBodyContains}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time (Last 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponseTimeChart results={resultsData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>30-Day Uptime History</CardTitle>
              </CardHeader>
              <CardContent>
                <UptimeBar results={resultsData} days={30} />
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="p-4 border-b bg-muted/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Recent Checks Log
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-xs">
                      {filteredChecksRes?.total ?? resultsData.length} total
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['today', 'yesterday', '7d', '15d', '30d'] as const).map((tf) => (
                      <Button
                        key={tf}
                        variant={checkTimeframe === tf ? 'default' : 'ghost'}
                        size="sm"
                        className="h-6 text-[11px] px-2 font-medium"
                        onClick={() => {
                          setCheckTimeframe(tf);
                          setCheckPage(1);
                        }}
                      >
                        {tf === 'today'
                          ? 'Today'
                          : tf === 'yesterday'
                          ? 'Yesterday'
                          : tf === '7d'
                          ? '7 Days'
                          : tf === '15d'
                          ? '15 Days'
                          : '30 Days'}
                      </Button>
                    ))}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-1"
                      onClick={() => refetchChecks()}
                      disabled={isFetchingChecks}
                      title="Refresh Checks"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingChecks ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Status:</span>
                  {(['all', 'up', 'degraded', 'down'] as const).map((st) => (
                    <Button
                      key={st}
                      variant={checkStatusFilter === st ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 text-[10px] px-2 capitalize"
                      onClick={() => {
                        setCheckStatusFilter(st);
                        setCheckPage(1);
                      }}
                    >
                      {st === 'all'
                        ? 'All'
                        : st === 'up'
                        ? 'Good (UP)'
                        : st === 'degraded'
                        ? 'Warning'
                        : 'Down'}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoadingFilteredChecks ? (
                  <div className="p-8 flex justify-center">
                    <LoadingSpinner />
                  </div>
                ) : (filteredChecksRes?.results || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No checks recorded for this timeframe ({checkTimeframe}).
                  </p>
                ) : (
                  <div className="divide-y">
                    {(filteredChecksRes?.results || []).map((result: any) => {
                      const isDown = result.status === 'down';
                      const isWarning = result.status === 'degraded';

                      return (
                        <div
                          key={result._id}
                          className={`flex items-center justify-between p-3 text-xs transition-colors hover:bg-muted/20 ${
                            isDown
                              ? 'bg-red-500/[0.04]'
                              : isWarning
                              ? 'bg-amber-500/[0.04]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StatusBadge status={result.status} size="sm" />
                            <span className="text-muted-foreground text-[11px] font-mono whitespace-nowrap">
                              {format(new Date(result.checkedAt), 'MMM d, HH:mm:ss')}
                            </span>
                            {result.urlLabel && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {result.urlLabel}
                              </Badge>
                            )}
                            {result.errorMessage && (
                              <span className="text-red-500 text-[11px] truncate max-w-[180px] font-mono">
                                {result.errorMessage}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {result.statusCode ? (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  result.statusCode >= 200 && result.statusCode < 300
                                    ? 'text-emerald-600 border-emerald-500/30'
                                    : 'text-red-600 border-red-500/30'
                                }`}
                              >
                                HTTP {result.statusCode}
                              </Badge>
                            ) : null}
                            <span
                              className={`font-mono text-xs font-semibold ${
                                result.responseTimeMs > 1500
                                  ? 'text-red-500'
                                  : result.responseTimeMs > 500
                                  ? 'text-amber-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {result.responseTimeMs !== undefined ? `${result.responseTimeMs} ms` : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {filteredChecksRes && filteredChecksRes.total > 15 && (
                  <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground bg-muted/10">
                    <span>
                      Page {checkPage} of {Math.ceil(filteredChecksRes.total / 15)} ({filteredChecksRes.total} total)
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={checkPage === 1}
                        onClick={() => setCheckPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        disabled={checkPage >= Math.ceil(filteredChecksRes.total / 15)}
                        onClick={() => setCheckPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Uptime Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Last 24 Hours</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{h24}%</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">Last 7 Days</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{d7}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last 30 Days</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{d30}%</span>
                </div>
              </CardContent>
            </Card>

            {project.ownerNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Owner Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {project.ownerNotes}
                </CardContent>
              </Card>
            )}

            {/* Host Server Outage Correlator Card for this Project */}
            <Card className="border border-red-500/30 bg-red-500/[0.02]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <Server className="w-4 h-4 text-red-500" />
                    Host Outage Correlation
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500 font-mono">
                    Host: 147.79.70.177
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Did other projects go down at the exact same second as {project.name}?
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-1 text-xs">
                {(() => {
                  const projClusters = (outageCorrRes?.clusters || []).filter((c: any) =>
                    c.projects.some((p: string) => p.toLowerCase().includes(project.name.toLowerCase()))
                  );
                  const simultaneous = projClusters.filter((c: any) => c.totalProjects >= 2);
                  const percentage =
                    projClusters.length > 0
                      ? Math.round((simultaneous.length / projClusters.length) * 100)
                      : 0;

                  return (
                    <>
                      <div className="p-2.5 rounded-md bg-muted/40 border space-y-1">
                        <div className="flex justify-between items-center font-medium">
                          <span>Simultaneous Host Drops:</span>
                          <strong className="text-red-500 font-mono">
                            {simultaneous.length} / {projClusters.length} ({percentage}%)
                          </strong>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          {percentage >= 50
                            ? `When ${project.name} goes down, other projects on server 147.79.70.177 ALSO fail at the exact same second. This confirms host server/network blips.`
                            : `Outages for ${project.name} appear isolated to this application.`}
                        </p>
                      </div>

                      {simultaneous.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Recent Simultaneous Drops:
                          </div>
                          {simultaneous.slice(0, 3).map((cl: any) => {
                            const thisProjErrors = (cl.projectErrors || []).filter(
                              (e: any) =>
                                e.projectName.toLowerCase().includes(project.name.toLowerCase()) ||
                                e.projectId === project._id
                            );
                            const primaryError = thisProjErrors[0];

                            return (
                              <div key={cl.id} className="p-2.5 rounded-lg border bg-card text-[11px] space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-mono font-semibold text-foreground">
                                    {format(new Date(cl.startTime), 'MMM d, HH:mm:ss')}
                                  </span>
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                    {cl.totalProjects} Projects Down
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Also affected: {cl.projects.filter((p: string) => !p.toLowerCase().includes(project.name.toLowerCase())).join(', ')}
                                </div>

                                {/* Project's Exact Error Box */}
                                <div className="p-2 rounded bg-muted/40 border text-[10px] space-y-1">
                                  <div className="flex items-center justify-between text-red-600 dark:text-red-400 font-bold font-mono">
                                    <span>{primaryError?.urlLabel || 'Primary App'}: {primaryError?.errorMessage || cl.sampleSummary}</span>
                                    <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-red-500/30 text-red-600 bg-red-500/10">
                                      {primaryError?.statusCode === 0 ? 'HTTP 0' : `HTTP ${primaryError?.statusCode || 0}`}
                                    </Badge>
                                  </div>
                                  <div className="text-muted-foreground leading-snug">
                                    <strong className="text-foreground/80">Exact Root Cause:</strong> {primaryError?.friendlyExplanation || 'Host 147.79.70.177 CPU/network load spike caused request timeout.'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <IncidentFeed incidents={incidentsData} />
          </div>
        </div>
      )}

      <EditProjectModal project={project} open={editOpen} onOpenChange={setEditOpen} />
      <AddServiceModal
        open={addServiceOpen}
        onOpenChange={setAddServiceOpen}
        defaultProjectId={project._id}
      />
      <TrackingSnippetModal
        open={snippetOpen}
        onOpenChange={setSnippetOpen}
        projectId={project._id}
        projectName={project.name}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        description={`Are you sure you want to delete ${project.name}? All health check history and schedules will be permanently deleted.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
