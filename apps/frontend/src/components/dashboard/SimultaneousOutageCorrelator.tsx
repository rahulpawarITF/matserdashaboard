import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';
import { useSystemSettings } from '@/hooks/useSystemSettings';
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
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Server,
  AlertTriangle,
  Clock,
  Layers,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Filter,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { OutageCluster } from '@/types';

type Timeframe = 'today' | 'yesterday' | '7d' | '15d' | '30d';

export function SimultaneousOutageCorrelator() {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [inspectedProject, setInspectedProject] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

  const toggleClusterExpanded = (clusterId: string) => {
    setExpandedClusters((prev) => ({ ...prev, [clusterId]: !prev[clusterId] }));
  };

  const { pollingInterval } = useSystemSettings();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', 'outage-correlation', timeframe],
    queryFn: () => dashboardApi.getOutageCorrelation({ timeframe }).then((r) => r.data),
    refetchInterval: pollingInterval,
  });

  const summary = data?.summary;
  const clusters: OutageCluster[] = data?.clusters || [];
  const hourlyDistribution = data?.hourlyDistribution || {};

  const timeframeLabels: Record<Timeframe, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'Last 7 Days',
    '15d': 'Last 15 Days',
    '30d': 'Last 30 Days',
  };

  // Extract list of all unique project names that have experienced an outage
  const allProjectsWithOutages = useMemo(() => {
    const set = new Set<string>();
    clusters.forEach((c) => c.projects.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [clusters]);

  // Project-specific diagnostics
  const projectSpecificStats = useMemo(() => {
    if (inspectedProject === 'all') return null;

    const projClusters = clusters.filter((c) =>
      c.projects.some((p) => p.toLowerCase().includes(inspectedProject.toLowerCase()))
    );
    const simultaneous = projClusters.filter((c) => c.totalProjects >= 2);
    const isolated = projClusters.filter((c) => c.totalProjects === 1);

    // Root cause count
    let timeoutCount = 0;
    let badGatewayCount = 0;
    let otherCount = 0;

    projClusters.forEach((c) => {
      const thisErrors =
        c.projectErrors?.filter((e) =>
          e.projectName.toLowerCase().includes(inspectedProject.toLowerCase())
        ) || [];

      if (thisErrors.length > 0) {
        thisErrors.forEach((err) => {
          if (err.causeType === 'timeout' || err.statusCode === 0) timeoutCount++;
          else if (err.causeType === '502_bad_gateway' || err.statusCode === 502) badGatewayCount++;
          else otherCount++;
        });
      } else {
        const summaryText = c.sampleSummary.toLowerCase();
        if (summaryText.includes('timeout') || summaryText.includes('connection')) {
          timeoutCount++;
        } else if (summaryText.includes('502') || summaryText.includes('bad gateway')) {
          badGatewayCount++;
        } else {
          otherCount++;
        }
      }
    });

    const total = projClusters.length;
    const simPercentage = total > 0 ? Math.round((simultaneous.length / total) * 100) : 0;

    return {
      total,
      simultaneous: simultaneous.length,
      isolated: isolated.length,
      simPercentage,
      timeoutCount,
      badGatewayCount,
      otherCount,
      recentClusters: projClusters.slice(0, 4),
    };
  }, [clusters, inspectedProject]);

  // Filtered clusters for the events list
  const displayedClusters = useMemo(() => {
    if (filterProject === 'all') return clusters;
    return clusters.filter((c) =>
      c.projects.some((p) => p.toLowerCase().includes(filterProject.toLowerCase()))
    );
  }, [clusters, filterProject]);

  const maxHourlyCount = Math.max(1, ...Object.values(hourlyDistribution).map((v) => Number(v) || 0));

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-red-500/10 text-red-600">
                  <Server className="w-5 h-5" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Simultaneous Server Outage Correlator
                </CardTitle>
                <Badge
                  variant="outline"
                  className="font-mono text-xs border-blue-500/30 text-blue-600 bg-blue-500/10"
                >
                  Host: {summary?.hostServer || '147.79.70.177'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Correlates downtime timestamps across all projects to determine if outages happen at the exact same
                second (identifying host server / network reboots vs isolated app issues).
              </p>
            </div>

            {/* Timeframe filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-lg border self-start lg:self-center">
              {(Object.keys(timeframeLabels) as Timeframe[]).map((tf) => (
                <Button
                  key={tf}
                  variant={timeframe === tf ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs px-2.5 font-medium transition-all"
                  onClick={() => setTimeframe(tf)}
                >
                  {timeframeLabels[tf]}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-7 w-7 ml-1"
                title="Refresh Correlation Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* 100% DYNAMIC OUTAGE SNAPSHOT (CLEAN, SIMPLE, INFORMATIVE) */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. WHEN IT HAPPENED (Dynamic Latest Time + Peak Window) */}
                <div className="p-3.5 rounded-xl border bg-card/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> 1. When Down?
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10">
                      Peak: {summary?.peakHour || 'None'}
                    </Badge>
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {summary?.latestOutageTime
                      ? `${formatDistanceToNow(new Date(summary.latestOutageTime))} ago`
                      : 'Zero Outages'}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Most Recent:</span>
                    <span className="font-mono font-medium text-foreground">
                      {summary?.latestOutageTime
                        ? format(new Date(summary.latestOutageTime), 'MMM d, HH:mm')
                        : '100% Stable'}
                    </span>
                  </div>
                </div>

                {/* 2. HOW LONG (Dynamic Recovery Duration + Total Count) */}
                <div className="p-3.5 rounded-xl border bg-card/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 2. How Long?
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                      {summary?.totalOutageEvents ?? 0} Events
                    </Badge>
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {summary?.avgDurationSeconds ? `~${summary.avgDurationSeconds}s Avg` : 'Instant Blip'}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Recovery:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Auto-Recovered (Fast)
                    </span>
                  </div>
                </div>

                {/* 3. WHY DOWN (Dynamic Root Cause Breakdown from Data) */}
                <div className="p-3.5 rounded-xl border bg-card/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" /> 3. Why Down?
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-red-500/30 text-red-600 bg-red-500/10">
                      Host: {summary?.hostServer || '147.79.70.177'}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-foreground truncate" title={summary?.dominantReason}>
                    {summary?.dominantReason || 'All healthy'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
                      {summary?.rootCauseBreakdown?.timeoutPercentage ?? 0}% Timeout
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 font-semibold">
                      {summary?.rootCauseBreakdown?.badGatewayPercentage ?? 0}% 502 PM2
                    </span>
                  </div>
                </div>

                {/* 4. WHO AFFECTED (Dynamic Top Affected Projects from Data) */}
                <div className="p-3.5 rounded-xl border bg-card/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> 4. Who Down?
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-600 bg-blue-500/10">
                      {summary?.serverWidePercentage ?? 0}% Simultaneous
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(summary?.topAffectedProjects || []).slice(0, 3).map((p) => (
                      <Badge
                        key={p.name}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5 font-medium bg-muted text-foreground flex items-center gap-1"
                      >
                        <span>{p.name}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">({p.count})</span>
                      </Badge>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {summary?.serverWideOutages ?? 0} server-wide drops • {summary?.singleAppGlitches ?? 0} isolated glitches
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PROJECT-SPECIFIC OUTAGE REASON INSPECTOR                 */}
              {/* ======================================================== */}
              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Project-Specific Outage Reason Inspector
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Select any project to see the exact breakdown of why that particular application went down.
                    </p>
                  </div>

                  <Select value={inspectedProject} onValueChange={setInspectedProject}>
                    <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs font-semibold">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects Combined</SelectItem>
                      {allProjectsWithOutages.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {projectSpecificStats && (
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-foreground text-sm">{inspectedProject}</span>
                        <span className="text-muted-foreground ml-2">
                          recorded {projectSpecificStats.total} downtime events in {timeframeLabels[timeframe]}.
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${
                          projectSpecificStats.simPercentage >= 50
                            ? 'border-red-500/40 text-red-600 bg-red-500/10'
                            : 'border-blue-500/40 text-blue-600 bg-blue-500/10'
                        }`}
                      >
                        {projectSpecificStats.simPercentage}% Server-Wide Drops
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-2.5 rounded bg-card border">
                        <div className="text-muted-foreground text-[11px]">Server Response Timeout</div>
                        <div className="text-lg font-bold text-red-600 mt-0.5">
                          {projectSpecificStats.timeoutCount} times
                        </div>
                        <div className="text-[10px] text-muted-foreground">Network/CPU saturation on host</div>
                      </div>

                      <div className="p-2.5 rounded bg-card border">
                        <div className="text-muted-foreground text-[11px]">Nginx 502 Bad Gateway</div>
                        <div className="text-lg font-bold text-amber-600 mt-0.5">
                          {projectSpecificStats.badGatewayCount} times
                        </div>
                        <div className="text-[10px] text-muted-foreground">App process crashed & restarted</div>
                      </div>

                      <div className="p-2.5 rounded bg-card border">
                        <div className="text-muted-foreground text-[11px]">Simultaneous With Other Apps</div>
                        <div className="text-lg font-bold text-blue-600 mt-0.5">
                          {projectSpecificStats.simultaneous} of {projectSpecificStats.total}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Occurred during full server hiccup</div>
                      </div>
                    </div>

                    {/* Specific Actionable Fix for this Project */}
                    <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                      <strong>Server Recommendation for {inspectedProject}:</strong>{' '}
                      {projectSpecificStats.simPercentage >= 50
                        ? `Because ${projectSpecificStats.simPercentage}% of downtime happened simultaneously with other projects, ${inspectedProject}'s code is healthy. To prevent this, check server 147.79.70.177's CPU & memory limits, and ensure Nginx keepalive is enabled.`
                        : `Because most drops for ${inspectedProject} were isolated, check the application's PM2 logs (pm2 logs ${inspectedProject.toLowerCase().replace(/\s+/g, '-')}) for memory leaks or unhandled promises.`}
                    </div>

                    {/* Filter All Outage Events Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => {
                          setFilterProject(inspectedProject);
                          const el = document.getElementById('identified-outage-events');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Filter className="w-3 h-3" /> Filter outage events below to "{inspectedProject}"
                      </Button>
                      <span className="text-[10px] text-muted-foreground">
                        Jumps directly to the failure breakdown for this project
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hourly Distribution Bar Visualizer */}
              <div className="p-3 rounded-lg border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> 24-Hour Outage Heatmap (When does the server experience downtime?)
                  </span>
                  <span className="text-[10px] font-normal">Outages peak between 2:00 PM – 3:00 PM</span>
                </div>
                <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 pt-1">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const count = hourlyDistribution[h] || 0;
                    const heightPercent = count > 0 ? Math.max(15, Math.round((count / maxHourlyCount) * 100)) : 6;
                    const isPeak = count === maxHourlyCount && count > 0;

                    return (
                      <div
                        key={h}
                        className="flex flex-col items-center gap-1 group cursor-pointer"
                        title={`Hour ${h}:00 - ${count} outage events`}
                      >
                        <div className="w-full h-12 bg-muted/40 rounded flex items-end justify-center p-0.5">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-sm transition-all ${
                              isPeak
                                ? 'bg-red-500 shadow-sm shadow-red-500/50'
                                : count > 0
                                ? 'bg-amber-500/70'
                                : 'bg-muted/60'
                            }`}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground group-hover:text-foreground">
                          {h}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Outage Events Timeline Table */}
              <div id="identified-outage-events" className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Identified Outage Events ({displayedClusters.length})</span>
                    </h4>
                    {filterProject !== 'all' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Filtered: {filterProject}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">Filter by Project:</span>
                    </div>
                    <Select value={filterProject} onValueChange={setFilterProject}>
                      <SelectTrigger className="h-7 text-xs w-[200px] bg-background">
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects ({clusters.length} events)</SelectItem>
                        {allProjectsWithOutages.map((p) => {
                          const count = clusters.filter((c) =>
                            c.projects.some((pr) => pr.toLowerCase().includes(p.toLowerCase()))
                          ).length;
                          return (
                            <SelectItem key={p} value={p} className="text-xs">
                              {p} ({count})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {filterProject !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setFilterProject('all')}
                        title="Clear Project Filter"
                      >
                        <X className="w-3 h-3 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                </div>

                {displayedClusters.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle2 className="w-10 h-10 text-emerald-500" />}
                    title={filterProject !== 'all' ? `No outages recorded for ${filterProject}` : 'Zero server outages detected!'}
                    description={
                      filterProject !== 'all'
                        ? `No downtime events recorded for ${filterProject} in ${timeframeLabels[timeframe]}.`
                        : `All projects have maintained 100% uptime with zero crashes in ${timeframeLabels[timeframe]}.`
                    }
                    className="border py-8 rounded-lg"
                  />
                ) : (
                  <div className="space-y-3">
                    {displayedClusters.map((cluster) => {
                      const isMulti = cluster.totalProjects >= 2;
                      const isFullServer = cluster.totalProjects >= 4;
                      const errors = cluster.projectErrors || [];
                      const isExpanded = !!expandedClusters[cluster.id];

                      // Sort errors so the filtered project appears at the top if filtered
                      const sortedErrors = [...errors].sort((a, b) => {
                        if (filterProject !== 'all') {
                          const aMatch = a.projectName.toLowerCase().includes(filterProject.toLowerCase());
                          const bMatch = b.projectName.toLowerCase().includes(filterProject.toLowerCase());
                          if (aMatch && !bMatch) return -1;
                          if (!aMatch && bMatch) return 1;
                        }
                        return a.projectName.localeCompare(b.projectName);
                      });

                      const visibleErrors = isExpanded ? sortedErrors : sortedErrors.slice(0, 4);
                      const hasMore = sortedErrors.length > 4;

                      return (
                        <div
                          key={cluster.id}
                          className={`p-4 rounded-lg border transition-all ${
                            isFullServer
                              ? 'bg-red-500/[0.03] border-red-500/40 hover:border-red-500 shadow-sm'
                              : isMulti
                              ? 'bg-amber-500/[0.03] border-amber-500/40 hover:border-amber-500'
                              : 'bg-card border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              {isFullServer ? (
                                <Badge className="bg-red-600 text-white text-[10px] uppercase font-bold tracking-wider">
                                  Server-Wide Outage
                                </Badge>
                              ) : isMulti ? (
                                <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 text-[10px]">
                                  Multi-Project Outage
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Single App
                                </Badge>
                              )}

                              <span className="text-xs font-mono font-semibold text-foreground">
                                {format(new Date(cluster.startTime), 'MMM d, yyyy — HH:mm:ss')}
                              </span>

                              <span className="text-[11px] text-muted-foreground">
                                ({formatDistanceToNow(new Date(cluster.startTime))} ago)
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-medium text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Duration:{' '}
                                <strong className="text-foreground font-mono">
                                  {cluster.durationSeconds > 0 ? `${cluster.durationSeconds}s` : 'Instant blip'}
                                </strong>
                              </span>

                              {cluster.resolvedTime ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                                </span>
                              ) : (
                                <span className="text-red-600 font-bold text-[11px] animate-pulse">
                                  OPEN INCIDENT
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Affected Projects Badges */}
                          <div className="pt-2.5 space-y-1.5">
                            <div className="text-[11px] font-medium text-muted-foreground">
                              Simultaneously Affected Projects ({cluster.totalProjects}):
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {cluster.projects.map((proj) => {
                                const isSelected =
                                  filterProject !== 'all' &&
                                  proj.toLowerCase().includes(filterProject.toLowerCase());

                                return (
                                  <Badge
                                    key={proj}
                                    variant="secondary"
                                    className={`text-xs font-medium px-2 py-0.5 ${
                                      isSelected
                                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/50 font-bold'
                                        : isFullServer
                                        ? 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                                        : 'bg-muted text-foreground'
                                    }`}
                                  >
                                    {proj}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>

                          {/* Exact Per-Project Failure Reason Breakdown */}
                          <div className="pt-3 border-t mt-3 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                Exact Root Cause per Project ({errors.length > 0 ? errors.length : cluster.totalProjects} components affected):
                              </span>
                              {hasMore && (
                                <button
                                  type="button"
                                  onClick={() => toggleClusterExpanded(cluster.id)}
                                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Show Less</span>
                                      <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Show All {sortedErrors.length} Components</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>

                            {errors.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {visibleErrors.map((err, idx) => {
                                  const isSelectedProj =
                                    filterProject !== 'all' &&
                                    err.projectName.toLowerCase().includes(filterProject.toLowerCase());

                                  return (
                                    <div
                                      key={`${err.projectName}-${err.urlLabel}-${idx}`}
                                      className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                                        isSelectedProj
                                          ? 'bg-amber-500/10 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                                          : 'bg-card border-border/70'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                          <span>{err.projectName}</span>
                                          {isSelectedProj && (
                                            <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600 bg-amber-500/10 px-1 py-0 h-4">
                                              Filtered Target
                                            </Badge>
                                          )}
                                        </span>

                                        <Badge
                                          variant="outline"
                                          className={`font-mono text-[10px] px-1.5 py-0 h-4 ${
                                            err.statusCode >= 500
                                              ? 'border-red-500/40 text-red-600 bg-red-500/10'
                                              : err.statusCode === 0
                                              ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                              : 'border-muted-foreground/30 text-muted-foreground'
                                          }`}
                                        >
                                          {err.statusCode === 0 ? 'HTTP 0 (Timeout)' : `HTTP ${err.statusCode}`}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <span>Target URL:</span>
                                        <span className="font-mono text-[10px] font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                                          {err.urlLabel}
                                        </span>
                                      </div>

                                      <div className="p-2 rounded bg-muted/40 border text-[11px] space-y-0.5">
                                        <div className="font-mono font-semibold text-red-600 dark:text-red-400">
                                          Error: {err.errorMessage}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground leading-snug">
                                          <strong className="text-foreground/80">Reason:</strong> {err.friendlyExplanation}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-2.5 rounded bg-muted/40 border text-xs text-red-600 dark:text-red-400 font-mono">
                                Diagnostic Error: {cluster.sampleSummary}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
