import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Users,
  Search,
  ArrowUpRight,
  BarChart3,
  Award,
  Smartphone,
  Database,
  ShieldCheck,
  Globe,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrackingSnippetModal } from './TrackingSnippetModal';

interface ProjectUserAnalyticsProps {
  projects: any[];
}

export function ProjectUserAnalytics({ projects }: ProjectUserAnalyticsProps) {
  const navigate = useNavigate();
  // analyticsMode: 'registered' (Default - real DB accounts) or 'webtraffic' (live pageview beacons)
  const [analyticsMode, setAnalyticsMode] = useState<'registered' | 'webtraffic'>('registered');
  const [timeframe, setTimeframe] = useState<'today' | 'week'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'users' | 'name'>('users');
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [snippetProject, setSnippetProject] = useState<any>(null);

  // Compute stats for each project based on mode
  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const userCount = p.registeredUsers ?? p.userCount ?? 0;
      const userSource = p.registeredUserSource || p.userSource || 'Database';
      const webVisitors = timeframe === 'today' ? (p.activeUsersToday ?? p.todayVisitors ?? 0) : (p.activeUsersWeek ?? p.weekVisitors ?? 0);
      const webViews = webVisitors;

      const displayUsers = analyticsMode === 'registered' ? userCount : webVisitors;
      const displayViews = analyticsMode === 'registered' ? userCount : webViews;
      const pagesPerVisit = webVisitors > 0 ? (webViews / webVisitors).toFixed(1) : '1.0';

      return {
        _id: p._id,
        name: p.name,
        category: p.category || 'Web Application',
        environment: p.environment,
        currentStatus: p.currentStatus,
        latency: p.latestResponseTimeMs || 0,
        userCount,
        registeredUsers: userCount,
        userSource,
        registeredUserSource: userSource,
        webVisitors,
        webViews,
        displayUsers,
        displayViews,
        pagesPerVisit,
        ownerNotes: p.ownerNotes,
      };
    });
  }, [projects, analyticsMode, timeframe]);

  // Totals across all projects
  const totalUsers = useMemo(
    () => projectStats.reduce((sum, p) => sum + p.userCount, 0),
    [projectStats]
  );

  const totalRegistered = totalUsers;

  const totalWebVisitors = useMemo(
    () => projectStats.reduce((sum, p) => sum + p.webVisitors, 0),
    [projectStats]
  );

  // Sorted and filtered list
  const filteredAndSorted = useMemo(() => {
    return projectStats
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.userSource.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'users') return b.userCount - a.userCount;
        return a.name.localeCompare(b.name);
      });
  }, [projectStats, searchQuery, sortBy]);

  const topProject = useMemo(() => {
    return [...projectStats].sort((a, b) => b.userCount - a.userCount)[0];
  }, [projectStats]);

  // Chart data: Top 10 projects showing Registered Users
  const chartData = useMemo(() => {
    return [...projectStats]
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 10)
      .map((p) => ({
        name: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
        fullName: p.name,
        users: p.userCount,
        userSource: p.userSource,
      }));
  }, [projectStats]);

  const handleOpenSnippet = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setSnippetProject(project);
    setSnippetModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------- */}
      {/* MODE TOGGLE BANNER                                    */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>Authentic Production Data Verified</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                100% Safe Read-Only
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {analyticsMode === 'registered'
                ? 'Displaying verified registered accounts directly from each project database on 147.79.70.177.'
                : 'Displaying verified live browser traffic. No synthetic or simulated visits.'}
            </p>
          </div>
        </div>

        {/* Mode Switch Buttons */}
        <div className="inline-flex rounded-lg border p-1 bg-background text-xs shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => setAnalyticsMode('registered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              analyticsMode === 'registered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Registered Accounts ({totalRegistered.toLocaleString()})</span>
          </button>
          <button
            type="button"
            onClick={() => setAnalyticsMode('webtraffic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              analyticsMode === 'webtraffic'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web Traffic ({totalWebVisitors})</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. TOP STATS CARDS: ONLY REGISTERED USERS            */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Registered Users */}
        <Card className="border border-blue-500/30 bg-gradient-to-br from-card to-blue-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {analyticsMode === 'registered' ? 'Total Registered Users' : timeframe === 'today' ? "Today's Web Visitors" : '7-Day Web Visitors'}
              </span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {analyticsMode === 'registered' ? totalUsers.toLocaleString() : totalWebVisitors.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Verified registered user accounts
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Top Application */}
        <Card className="border border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Largest User Base</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-foreground truncate" title={topProject?.name}>
              {topProject?.name || '—'}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {topProject?.userCount.toLocaleString()} Registered Users
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Average Per Project */}
        <Card className="border border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Average Per Project</span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {Math.round(totalUsers / (projects.length || 1)).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Average registered users across {projects.length} applications
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Database Connection Status */}
        <Card className="border border-purple-500/30 bg-gradient-to-br from-card to-purple-500/5 shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">Production Databases</span>
              <CheckCircle2 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {projects.length} Live DBs
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Database className="w-3 h-3 text-purple-500" /> 147.79.70.177:27017 (Read-Only)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. CONTROLS BAR: SEARCH & SORT                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-lg border border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {analyticsMode === 'registered' ? 'Database Registry:' : 'Traffic Timeframe:'}
          </span>
          {analyticsMode === 'webtraffic' ? (
            <div className="inline-flex rounded-md border p-0.5 bg-background text-xs">
              <button
                type="button"
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  timeframe === 'today'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('week')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  timeframe === 'week'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Last 7 Days
              </button>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs bg-muted/50 text-foreground font-mono">
              Direct DB Documents Count
            </Badge>
          )}
        </div>

        {/* Right: Search & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter by project or database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background w-[220px]"
            />
          </div>

          <div className="inline-flex rounded-md border p-0.5 bg-background text-xs">
            <button
              type="button"
              onClick={() => setSortBy('users')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                sortBy === 'users' ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Most Users
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                sortBy === 'name' ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Alphabetical
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* ---------------------------------------------------- */}
      {/* 3. VISUAL RANKING BAR CHART: REGISTERED USERS        */}
      {/* ---------------------------------------------------- */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Top Applications by Registered Users
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Verified registered user base distribution across your live MongoDB server
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-2.5 py-1">
            Total: {totalUsers.toLocaleString()} Users
          </Badge>
        </CardHeader>
        <CardContent className="p-4 pt-5">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val).toLocaleString()} Registered Users`,
                    `Collection: ${item?.payload?.userSource || 'Database'}`,
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    backgroundColor: 'rgba(23, 23, 23, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="users" name="Registered Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------- */}
      {/* 4. PER-PROJECT DETAILED RANKINGS & METRICS           */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-semibold uppercase tracking-wider">
            All Monitored Projects ({filteredAndSorted.length})
          </span>
          <span>Ranked by Verified Registered Users</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAndSorted.map((proj, idx) => {
            const sharePercent = totalUsers > 0 ? ((proj.userCount / totalUsers) * 100).toFixed(1) : '0';
            const hasMobile = proj.ownerNotes?.includes('play.google.com') || proj.ownerNotes?.includes('apps.apple.com');

            return (
              <div
                key={proj._id}
                className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all space-y-2.5 group cursor-pointer"
                onClick={() => navigate(`/projects/${proj._id}`)}
              >
                {/* Header: Rank + Project Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {proj.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 truncate">
                        <span>{proj.category}</span>
                        {hasMobile && (
                          <span className="inline-flex items-center text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                            <Smartphone className="w-2.5 h-2.5 mr-0.5" /> App
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <StatusBadge status={proj.currentStatus} size="sm" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      title="Install Live Web Tracking Snippet"
                      onClick={(e) => handleOpenSnippet(e, proj)}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground group-hover:text-primary"
                      title="View Project Detail"
                      onClick={() => navigate(`/projects/${proj._id}`)}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Metrics Row: Registered Users & Database Collection */}
                <div className="grid grid-cols-2 gap-2 py-2 px-2.5 rounded-lg bg-muted/30 items-center">
                  <div className="text-left pl-1">
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-500" /> Registered Users
                    </div>
                    <div className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
                      {proj.userCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-left pl-2 border-l border-border/60">
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Database Collection</div>
                    <div className="text-xs font-mono font-medium text-foreground truncate" title={proj.userSource}>
                      {proj.userSource}
                    </div>
                  </div>
                </div>

                {/* User Share Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Proportion of Total Registered Users</span>
                    <span className="font-mono font-semibold text-foreground">{sharePercent}%</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(1, parseFloat(sharePercent)))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Snippet Modal */}
      {snippetProject && (
        <TrackingSnippetModal
          open={snippetModalOpen}
          onOpenChange={(open) => {
            setSnippetModalOpen(open);
            if (!open) setSnippetProject(null);
          }}
          projectId={snippetProject._id}
          projectName={snippetProject.name}
        />
      )}
    </div>
  );
}
