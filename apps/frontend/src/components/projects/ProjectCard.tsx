import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  ExternalLink,
  Edit2,
  Trash2,
  Users,
  RefreshCw,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Mail,
  Server,
  ArrowUpRight,
  Zap,
  KeyRound,
  Smartphone,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EditProjectModal } from './EditProjectModal';
import { ProjectCredentialsModal } from './ProjectCredentialsModal';
import { ServiceDownDetailsModal } from '../services/ServiceDownDetailsModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects.api';
import { toast } from 'sonner';

interface ProjectCardProps {
  project: Project & {
    userCount?: number;
    registeredUsers?: number;
    registeredUserSource?: string;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [credsOpen, setCredsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(project._id),
    onSuccess: () => {
      toast.success(`Project "${project.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteOpen(false);
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      await projectsApi.triggerCheck(project._id);
      toast.success(`Health check triggered for ${project.name}!`);
      // Invalidate queries after 1.5s to capture updated result
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        setIsChecking(false);
      }, 1500);
    } catch (err: any) {
      toast.error('Check failed: ' + (err.message || 'Server error'));
      setIsChecking(false);
    }
  };

  // Find Frontend and Admin URLs
  const frontendUrlObj =
    project.urls?.find(
      (u) =>
        u.label.toLowerCase().includes('front') ||
        u.label.toLowerCase().includes('main') ||
        u.label.toLowerCase().includes('app') ||
        u.label.toLowerCase().includes('site')
    ) || project.urls?.[0];

  const adminUrlObj = project.urls?.find((u) =>
    u.label.toLowerCase().includes('admin')
  );

  const otherUrls = project.urls?.filter(
    (u) => u !== frontendUrlObj && u !== adminUrlObj
  ) || [];

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'sms':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-3.5 h-3.5 text-purple-500" />;
      case 'email':
        return <Mail className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Server className="w-3.5 h-3.5 text-sky-500" />;
    }
  };

  const responseTime = project.latestResponseTimeMs ? `${project.latestResponseTimeMs} ms` : '—';
  const todayVisitors = (project.activeUsersToday ?? project.todayVisitors ?? 0).toLocaleString();

  const linkedServices = project.linkedServices || [];
  const downServices = linkedServices.filter((s: any) => s.currentStatus === 'down');
  const hasDownService = downServices.length > 0;

  return (
    <>
      <Card className={`hover:shadow-md transition-all duration-200 flex flex-col h-full bg-card border group ${
        hasDownService
          ? 'border-red-500/50 hover:border-red-500/80 shadow-xs shadow-red-500/5'
          : 'border-border/80 hover:border-primary/40'
      }`}>
        {/* Card Header: Title, Description, Edit & Delete */}
        <CardHeader className="pb-3 border-b bg-muted/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <CardTitle
                  className="text-base font-bold truncate text-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  {project.name}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 capitalize font-mono text-muted-foreground"
                >
                  {project.environment}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20 flex items-center gap-1 font-semibold"
                  title={`Live Users Collection: ${project.userSource || 'users'}`}
                >
                  <Users className="w-2.5 h-2.5" />
                  {(project.registeredUsers ?? project.userCount ?? 0).toLocaleString()} Users
                </Badge>
                {project.ga4PropertyId && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] py-0 px-1 font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"
                  >
                    GA4 Connected
                  </Badge>
                )}
                {project.ownerNotes && (project.ownerNotes.includes('play.google.com') || project.ownerNotes.includes('apps.apple.com')) && (
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-0.5"
                    title="Mobile App Release Available"
                  >
                    <Smartphone className="w-2.5 h-2.5" /> App
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {project.description ||
                  `Real-time monitored ${project.category || 'application'}`}
              </p>
            </div>

            {/* Direct Action Icons */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {project.ownerNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1 font-medium"
                  title="View Access Credentials & Notes"
                  onClick={() => setCredsOpen(true)}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Access</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Edit Project"
                onClick={() => setEditOpen(true)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete Project"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-3.5 pb-4 px-4 flex-1 flex flex-col justify-between space-y-4">
          {/* Status Row: Live Status + Response Time + Linked Service Alert + Last Checked */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StatusBadge status={project.currentStatus} size="sm" />
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                <Zap className="w-3 h-3 text-amber-500" />
                {responseTime}
              </span>
              {hasDownService && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedService(downServices[0]);
                    setServiceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold py-0.5 px-2 rounded-full border border-red-500/50 bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse hover:bg-red-500/25 transition-colors cursor-pointer"
                  title={`Click to view outage details for ${downServices.map((s: any) => s.name).join(', ')}`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>{downServices[0].name} DOWN</span>
                </button>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {project.lastCheckedAt
                ? `Checked ${formatDistanceToNow(new Date(project.lastCheckedAt))} ago`
                : 'Checked just now'}
            </span>
          </div>

          {/* Clickable Live URLs: Frontend + Admin */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Live Endpoints
            </div>
            <div className="flex flex-wrap gap-2">
              {frontendUrlObj && (
                <a
                  href={frontendUrlObj.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary font-medium transition-colors"
                  title={frontendUrlObj.url}
                >
                  <ExternalLink className="w-3 h-3" />
                  {frontendUrlObj.label || 'Live Site'}
                </a>
              )}

              {adminUrlObj && (
                <a
                  href={adminUrlObj.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted border border-border text-foreground font-medium transition-colors"
                  title={adminUrlObj.url}
                >
                  <ExternalLink className="w-3 h-3" />
                  Admin Panel
                </a>
              )}

              {otherUrls.slice(0, 2).map((u, idx) => (
                <a
                  key={idx}
                  href={u.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-muted/40 hover:bg-muted border border-border text-muted-foreground font-medium transition-colors"
                  title={u.url}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  {u.label}
                </a>
              ))}
            </div>
          </div>

          {/* Linked Third-Party Services (SMG99, WhatsApp, etc.) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Third-Party Services</span>
              <span className="text-[10px] font-normal lowercase">
                {project.linkedServices?.length || 0} linked
              </span>
            </div>
            {project.linkedServices && project.linkedServices.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {project.linkedServices.map((svc: any) => {
                  const isSvcDown = svc.currentStatus === 'down';
                  const isSvcDegraded = svc.currentStatus === 'degraded';
                  return (
                    <button
                      key={svc._id || svc.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedService(svc);
                        setServiceModalOpen(true);
                      }}
                      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                        isSvcDown
                          ? 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20 font-semibold shadow-xs'
                          : isSvcDegraded
                          ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-semibold'
                          : 'bg-card hover:bg-muted/60 text-foreground font-medium'
                      }`}
                      title={
                        isSvcDown
                          ? `Outage: ${svc.name} is DOWN! Click for full down diagnostics.`
                          : isSvcDegraded
                          ? `Warning: ${svc.name} is Degraded. Click for diagnostics.`
                          : `${svc.name} (Operational). Click for details.`
                      }
                    >
                      {getServiceIcon(svc.type)}
                      <span className="truncate max-w-[110px]">{svc.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          svc.currentStatus === 'up'
                            ? 'bg-emerald-500'
                            : svc.currentStatus === 'down'
                            ? 'bg-red-500 animate-ping'
                            : 'bg-amber-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                No third-party services linked.
              </p>
            )}
          </div>

          {/* Registered Users & Live Web Traffic Breakdown */}
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                  Registered Users
                </div>
                <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 truncate">
                  {(project.registeredUsers ?? project.userCount ?? 0).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0 border-l border-border/70 pl-3">
              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate flex items-center gap-1">
                  <span>Active Today</span>
                  {project.analyticsSource === 'ga4' ? (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-1 py-0.2 rounded leading-tight" title="Live data from Google Analytics 4">
                      GA4
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/15 px-1 py-0.2 rounded leading-tight" title="Real active users today from production database (read-only)">
                      Live DB
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold font-mono text-foreground truncate">
                  {todayVisitors}
                </div>
              </div>
            </div>
          </div>

          {/* Card Footer: Check Now Button & Details Link */}
          <div className="pt-2 border-t flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-primary/20 hover:bg-primary/5 text-primary"
              onClick={handleManualCheck}
              disabled={isChecking}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check Now'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              Details & Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditProjectModal project={project} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        description={`Are you sure you want to delete ${project.name}? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />

      <ServiceDownDetailsModal
        service={selectedService}
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
      />

      <ProjectCredentialsModal
        project={project}
        open={credsOpen}
        onOpenChange={setCredsOpen}
      />
    </>
  );
}
