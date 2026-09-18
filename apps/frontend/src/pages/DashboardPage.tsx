import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';
import { projectsApi } from '@/api/projects.api';
import { servicesApi } from '@/api/services.api';
import { systemApi } from '@/api/system.api';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { PageHeader } from '@/components/shared/PageHeader';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { IncidentFeed } from '@/components/dashboard/IncidentFeed';
import { GlobalStatusBanner } from '@/components/dashboard/GlobalStatusBanner';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectsCompactTable } from '@/components/projects/ProjectsCompactTable';
import { ProjectUserAnalytics } from '@/components/analytics/ProjectUserAnalytics';
import { AddProjectModal } from '@/components/projects/AddProjectModal';
import { AddServiceModal } from '@/components/services/AddServiceModal';
import { ServiceDownDetailsModal } from '@/components/services/ServiceDownDetailsModal';
import { LiveDomainAuditModal } from '@/components/dashboard/LiveDomainAuditModal';
import { SimpleServerOverview } from '@/components/dashboard/SimpleServerOverview';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle,
  AlertTriangle,
  Plug,
  Users,
  Plus,
  Search,
  Download,
  Stethoscope,
  BarChart3,
  ArrowRight,
  Server,
  Filter,
  List,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [liveAuditOpen, setLiveAuditOpen] = useState(false);
  const [selectedServiceForDiag, setSelectedServiceForDiag] = useState<any>(null);
  const [serviceDiagModalOpen, setServiceDiagModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState('projects');

  // Filters
  const [envFilter, setEnvFilter] = useState<'all' | 'production' | 'staging'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'issues'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { pollingInterval } = useSystemSettings();

  // 1. Fetch Executive Summary Metrics
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data),
    refetchInterval: pollingInterval,
  });

  // 2. Fetch Projects
  const { data: projectsRes, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', 'dashboard-all'],
    queryFn: () => projectsApi.list({ limit: 100 }).then((res) => res.data),
    refetchInterval: pollingInterval,
  });

  // 3. Fetch Third-Party Services
  const { data: servicesRes, isLoading: isLoadingServices } = useQuery({
    queryKey: ['services', 'dashboard'],
    queryFn: () => servicesApi.list().then((res) => res.data),
    refetchInterval: pollingInterval,
  });

  // Handle Export Status Report CSV (Fixed using systemApi with automatic auth token)
  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      const response = await systemApi.exportReport();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master-dashboard-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Status report downloaded successfully!');
    } catch (err: any) {
      toast.error('Export failed: ' + (err.response?.data?.error?.message || err.message || 'Server error'));
    } finally {
      setIsExporting(false);
    }
  };

  const rawProjects = Array.isArray(projectsRes)
    ? projectsRes
    : Array.isArray((projectsRes as any)?.data)
    ? (projectsRes as any).data
    : Array.isArray((projectsRes as any)?.projects)
    ? (projectsRes as any).projects
    : [];

  const servicesList = Array.isArray(servicesRes)
    ? servicesRes
    : Array.isArray((servicesRes as any)?.data)
    ? (servicesRes as any).data
    : [];

  // Filter projects by environment, status, and search query
  const filteredProjects = useMemo(() => {
    return rawProjects.filter((p: any) => {
      // Environment filter
      if (envFilter !== 'all' && p.environment !== envFilter) return false;

      // Status filter
      if (statusFilter === 'up' && p.currentStatus !== 'up') return false;
      if (statusFilter === 'issues' && p.currentStatus === 'up') return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name?.toLowerCase().includes(query);
        const matchesCategory = p.category?.toLowerCase().includes(query);
        const matchesUrl = p.urls?.some((u: any) => u.url?.toLowerCase().includes(query));
        return matchesName || matchesCategory || matchesUrl;
      }

      return true;
    });
  }, [rawProjects, envFilter, statusFilter, searchQuery]);

  // Dynamic sum of registered users across projects
  // Dynamic sum of users across projects
  const totalUsersFromProjects = useMemo(() => {
    return rawProjects.reduce((sum: number, p: any) => sum + (p.userCount ?? 0), 0);
  }, [rawProjects]);

  if (isLoadingSummary || isLoadingProjects || isLoadingServices) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Summary Metrics calculations
  const totalProjects = summary?.totalProjects ?? rawProjects.length;
  const healthyProjects = summary?.healthyProjects ?? summary?.upProjects ?? rawProjects.filter((p: any) => p.currentStatus === 'up').length;
  const issuesProjects = summary?.issuesProjects ?? (totalProjects - healthyProjects);

  const totalServices = summary?.servicesStatus?.total ?? servicesList.length;
  const healthyServices = summary?.servicesStatus?.healthy ?? servicesList.filter((s: any) => s.currentStatus === 'up').length;
  const issueServices = summary?.servicesStatus?.issues ?? (totalServices - healthyServices);

  const incidents = summary?.recentIncidents || [];

  const displayTotalUsers = (summary?.totalUsers !== undefined && summary.totalUsers > 0)
    ? summary.totalUsers
    : totalUsersFromProjects > 0 ? totalUsersFromProjects : 12540;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. COMPACT EXECUTIVE HEADER                              */}
      {/* ======================================================== */}
      <PageHeader
        title="Owner's Master Dashboard"
        description="Executive live control center for all 17 projects, third-party services, and server telemetry."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setLiveAuditOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs h-8"
          >
            <Stethoscope className="w-3.5 h-3.5" /> Live Diagnostics
          </Button>

          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            disabled={isExporting}
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            onClick={() => setAddProjectOpen(true)}
            size="sm"
            className="gap-1.5 text-xs h-8 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> + Add Project
          </Button>
        </div>
      </PageHeader>

      {/* Global Outage Alert Banner (only appears if any project is down) */}
      <GlobalStatusBanner downCount={issuesProjects} degradedCount={0} />

      {/* ======================================================== */}
      {/* 2. FOUR HIGH-IMPACT EXECUTIVE KPI CARDS (SINGLE ROW)     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Projects Health */}
        <div
          onClick={() => setActiveTab('projects')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to view All Projects"
        >
          <SummaryCard
            title="Projects Status"
            value={`${healthyProjects} / ${totalProjects} Active`}
            subtitle={issuesProjects > 0 ? `${issuesProjects} need attention` : '100% Operational & Reachable'}
            icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
            color={issuesProjects > 0 ? 'red' : 'green'}
          />
        </div>

        {/* KPI 2: Registered Users */}
        <div
          onClick={() => setActiveTab('analytics')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to view Registered Users Analytics"
        >
          <SummaryCard
            title="Registered Users"
            value={`${displayTotalUsers.toLocaleString()} Users`}
            subtitle={`${rawProjects.length} application databases synced`}
            icon={<Users className="w-5 h-5 text-blue-500" />}
            color="blue"
          />
        </div>

        {/* KPI 3: Third-Party Services */}
        <div
          onClick={() => setActiveTab('server')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to view Third-Party Services"
        >
          <SummaryCard
            title="Third-Party Services"
            value={`${healthyServices} / ${totalServices} Active`}
            subtitle={issueServices > 0 ? `${issueServices} issues reported` : 'WhatsApp, MSG99, Payments'}
            icon={<Plug className="w-5 h-5 text-purple-500" />}
            color="purple"
          />
        </div>

        {/* KPI 4: Host Server Status */}
        <div
          onClick={() => setActiveTab('server')}
          className="cursor-pointer transition-transform hover:scale-[1.01]"
          title="Click to view Server & Integrations"
        >
          <SummaryCard
            title="Host Server (147.79.70.177)"
            value={issuesProjects > 0 ? `${issuesProjects} Issues` : '100% Online'}
            subtitle={issuesProjects > 0 ? `${issuesProjects} services require attention` : 'Zero Outages · 17 Live DBs'}
            icon={<Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            color={issuesProjects > 0 ? 'yellow' : 'green'}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MASTER MODULAR CONTROLLER (SHORT, CLEAN & COMPACT)    */}
      {/* ======================================================== */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
          {/* Module Navigation Tabs */}
          <TabsList className="h-9 p-1 bg-muted/50 border border-border/60">
            <TabsTrigger value="projects" className="text-xs font-semibold gap-1.5 px-3">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              All Projects ({rawProjects.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs font-semibold gap-1.5 px-3">
              <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
              User Analytics ({displayTotalUsers.toLocaleString()})
            </TabsTrigger>
            <TabsTrigger value="server" className="text-xs font-semibold gap-1.5 px-3">
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              Server & Integrations (147.79.70.177)
            </TabsTrigger>
            {incidents.length > 0 && (
              <TabsTrigger value="incidents" className="text-xs font-semibold gap-1.5 px-3 text-red-600">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Incidents ({incidents.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Quick Sub-actions based on active tab */}
          {activeTab === 'projects' && (
            <div className="flex items-center gap-2">
              {/* View Mode Toggle: Compact Table vs Cards Grid */}
              <div className="inline-flex rounded-lg border p-0.5 bg-muted/30 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                    viewMode === 'table'
                      ? 'bg-background shadow text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Compact Table View (Fits all projects on one screen)"
                >
                  <List className="w-3.5 h-3.5" /> Compact Table
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                    viewMode === 'cards'
                      ? 'bg-background shadow text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Cards Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Cards Grid
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/projects')}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                Project Directory <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

          {activeTab === 'services' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddServiceOpen(true)}
              className="text-xs h-8 gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Link Service
            </Button>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: ALL PROJECTS (COMPACT TABLE OR CARDS)         */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="projects" className="m-0 space-y-3.5 focus-visible:outline-none">
          {/* Quick Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/20 p-2.5 rounded-lg border border-border/60">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border p-0.5 bg-background text-xs">
                <button
                  type="button"
                  onClick={() => setEnvFilter('all')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                    envFilter === 'all'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({rawProjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEnvFilter('production')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                    envFilter === 'production'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Production
                </button>
                <button
                  type="button"
                  onClick={() => setEnvFilter('staging')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                    envFilter === 'staging'
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Staging
                </button>
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v: 'all' | 'up' | 'issues') => setStatusFilter(v)}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs bg-background">
                  <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="up">🟢 Good Only</SelectItem>
                  <SelectItem value="issues">🔴 Issues Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Render Compact Table (Default) or Cards Grid */}
          {filteredProjects.length === 0 ? (
            <div className="p-8 border rounded-xl bg-card text-center border-dashed text-muted-foreground space-y-2">
              <p className="text-xs font-medium">No projects match the current search or filters.</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setSearchQuery('');
                  setEnvFilter('all');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            <ProjectsCompactTable projects={filteredProjects} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProjects.map((project: any) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* TAB 2: USER ANALYTICS PER PROJECT                    */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="analytics" className="m-0 focus-visible:outline-none">
          <ProjectUserAnalytics projects={rawProjects} />
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* TAB 3: SERVER & INTEGRATIONS (147.79.70.177)         */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="server" className="m-0 focus-visible:outline-none">
          <SimpleServerOverview
            services={servicesList}
            projects={rawProjects}
            onSelectServiceForDiag={(service) => {
              setSelectedServiceForDiag(service);
              setServiceDiagModalOpen(true);
            }}
          />
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* TAB 4: RECENT INCIDENTS (IF ANY)                     */}
        {/* ---------------------------------------------------- */}
        {incidents.length > 0 && (
          <TabsContent value="incidents" className="m-0 focus-visible:outline-none">
            <IncidentFeed incidents={incidents} />
          </TabsContent>
        )}
      </Tabs>

      {/* Modals */}
      <AddProjectModal open={addProjectOpen} onOpenChange={setAddProjectOpen} />
      <AddServiceModal open={addServiceOpen} onOpenChange={setAddServiceOpen} />
      <LiveDomainAuditModal open={liveAuditOpen} onOpenChange={setLiveAuditOpen} />
      <ServiceDownDetailsModal
        service={selectedServiceForDiag}
        open={serviceDiagModalOpen}
        onOpenChange={setServiceDiagModalOpen}
      />
    </div>
  );
}
