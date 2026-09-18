import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProjectCredentialsModal } from './ProjectCredentialsModal';
import {
  ExternalLink,
  KeyRound,
  RefreshCw,
  ArrowUpRight,
  Smartphone,
  Zap,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { projectsApi } from '@/api/projects.api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface ProjectsCompactTableProps {
  projects: Project[];
}

export function ProjectsCompactTable({ projects }: ProjectsCompactTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProjectForCreds, setSelectedProjectForCreds] = useState<Project | null>(null);
  const [credsOpen, setCredsOpen] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleManualCheck = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setCheckingId(project._id);
    try {
      await (projectsApi.triggerCheck || projectsApi.checkNow)(project._id);
      toast.success(`Health check triggered for ${project.name}!`);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setCheckingId(null);
      }, 1500);
    } catch (err: any) {
      toast.error('Check failed: ' + (err.message || 'Server error'));
      setCheckingId(null);
    }
  };

  const handleOpenCreds = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setSelectedProjectForCreds(project);
    setCredsOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[210px] font-semibold text-xs">Project</TableHead>
              <TableHead className="w-[140px] font-semibold text-xs">Status & Latency</TableHead>
              <TableHead className="font-semibold text-xs">Live Endpoints</TableHead>
              <TableHead className="w-[100px] font-semibold text-xs text-center">Credentials</TableHead>
              <TableHead className="w-[130px] font-semibold text-xs text-right">Registered</TableHead>
              <TableHead className="w-[130px] font-semibold text-xs text-right">Active Today</TableHead>
              <TableHead className="w-[140px] font-semibold text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => {
              const frontendUrl =
                project.urls?.find(
                  (u) =>
                    u.label.toLowerCase().includes('front') ||
                    u.label.toLowerCase().includes('main') ||
                    u.label.toLowerCase().includes('app') ||
                    u.label.toLowerCase().includes('site')
                )?.url || project.urls?.[0]?.url;

              const adminUrl = project.urls?.find((u) =>
                u.label.toLowerCase().includes('admin')
              )?.url;

              const hasPlay = project.ownerNotes?.includes('play.google.com');
              const hasAppStore = project.ownerNotes?.includes('apps.apple.com');
              const isChecking = checkingId === project._id;
              const latency = project.latestResponseTimeMs ? `${project.latestResponseTimeMs}ms` : '—';
              const downService = (project.linkedServices || []).find((s: any) => s.currentStatus === 'down');

              return (
                <TableRow
                  key={project._id}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  {/* Column 1: Project Name & Category */}
                  <TableCell className="py-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {project.name}
                        {project.environment === 'staging' && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                            Staging
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span>{project.category || 'Web Application'}</span>
                        {(hasPlay || hasAppStore) && (
                          <span
                            className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded font-mono"
                            title="Mobile Apps Released"
                          >
                            <Smartphone className="w-2.5 h-2.5 mr-0.5" /> App
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Column 2: Status & Latency */}
                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={project.currentStatus} size="sm" />
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                          <Zap className="w-3 h-3 text-amber-500" />
                          {latency}
                        </span>
                      </div>
                      {downService && (
                        <div className="flex items-center">
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1.5 py-0 border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold animate-pulse"
                            title={`Linked third-party service "${downService.name}" is DOWN`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>{downService.name} Down</span>
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Column 3: Live Endpoints */}
                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {frontendUrl && (
                        <a
                          href={frontendUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-primary/5 hover:bg-primary/15 border border-primary/20 text-primary font-medium transition-colors"
                          title={frontendUrl}
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Live Site
                        </a>
                      )}
                      {adminUrl && (
                        <a
                          href={adminUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-muted/50 hover:bg-muted border border-border text-foreground font-medium transition-colors"
                          title={adminUrl}
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Admin
                        </a>
                      )}
                    </div>
                  </TableCell>

                  {/* Column 4: Credentials */}
                  <TableCell className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {project.ownerNotes ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={(e) => handleOpenCreds(e, project)}
                        title="View Login Credentials"
                      >
                        <KeyRound className="w-3 h-3" /> Access
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">—</span>
                    )}
                  </TableCell>

                  {/* Column 5: Registered Users */}
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-2 py-0.5"
                        title={`Registered Users: ${project.userSource || 'users'}`}
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {(project.registeredUsers ?? project.userCount ?? 0).toLocaleString()}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Column 6: Active Users Today (Traffic) */}
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Activity className="w-3 h-3 text-emerald-500" />
                      <span className="font-mono text-xs font-bold text-foreground">
                        {(project.activeUsersToday ?? project.todayVisitors ?? 0).toLocaleString()}
                      </span>
                      {project.analyticsSource === 'ga4' ? (
                        <span
                          className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded leading-none"
                          title="Live traffic from Google Analytics 4"
                        >
                          GA4
                        </span>
                      ) : (
                        <span
                          className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded leading-none"
                          title="Real active users today from production database (147.79.70.177)"
                        >
                          Live DB
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Column 6: Actions */}
                  <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                        onClick={(e) => handleManualCheck(e, project)}
                        disabled={isChecking}
                        title="Run Instant Health Check"
                      >
                        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-primary' : ''}`} />
                        <span className="hidden sm:inline">Check</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-primary hover:text-primary/80 gap-0.5"
                        onClick={() => navigate(`/projects/${project._id}`)}
                        title="View Detailed Analytics & Monitoring"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProjectCredentialsModal
        project={selectedProjectForCreds}
        open={credsOpen}
        onOpenChange={setCredsOpen}
      />
    </>
  );
}
