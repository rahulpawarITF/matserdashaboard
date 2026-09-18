import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { projectsApi } from '@/api/projects.api';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckNowButton } from '@/components/shared/CheckNowButton';
import { ResponseTimeChart } from '@/components/shared/ResponseTimeChart';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EditServiceModal } from '@/components/services/EditServiceModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, ArrowLeft, Eye, EyeOff, Lock, ExternalLink, AlertTriangle, Server, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreds, setShowCreds] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: serviceRes, isLoading: isLoadingService } = useQuery({
    queryKey: ['services', id],
    queryFn: () => servicesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: resultsRes } = useQuery({
    queryKey: ['services', id, 'results'],
    queryFn: () => servicesApi.getResults(id!).then((r) => r.data),
    enabled: !!id,
  });

  const { data: allProjectsRes } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 100 }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => servicesApi.delete(id!),
    onSuccess: () => {
      toast.success('Service deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/services');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete service');
    },
  });

  if (isLoadingService) return <LoadingSpinner fullPage />;
  const service = (serviceRes as any)?.data || serviceRes;
  if (!service) return <div className="p-6">Service not found</div>;

  const resultsData = Array.isArray(resultsRes)
    ? resultsRes
    : Array.isArray((resultsRes as any)?.data)
    ? (resultsRes as any).data
    : [];

  const projectsList = Array.isArray((allProjectsRes as any)?.data)
    ? (allProjectsRes as any).data
    : Array.isArray(allProjectsRes)
    ? allProjectsRes
    : [];

  const linkedProjects = projectsList.filter((p: any) =>
    service.linkedProjectIds?.some((lpid: any) => String(lpid?._id || lpid) === String(p._id)) ||
    p.linkedServiceIds?.some((lsid: any) => String(lsid?._id || lsid) === String(service._id)) ||
    p.linkedServices?.some((ls: any) => String(ls?._id || ls) === String(service._id))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4 cursor-pointer hover:text-foreground w-fit transition-colors"
        onClick={() => navigate('/services')}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </div>

      <PageHeader title={service.name} description={`Provider: ${service.provider}`}>
        <div className="flex items-center gap-2">
          <CheckNowButton targetId={service._id} targetType="service" variant="outline" />
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-4 items-center">
        <StatusBadge status={service.currentStatus} />
        <Badge variant="outline" className="capitalize">
          {service.type}
        </Badge>
        <Badge variant="secondary" className="capitalize">
          {service.checkMethod} check
        </Badge>
        <div className="text-sm text-muted-foreground">
          Checked{' '}
          {service.lastCheckedAt
            ? formatDistanceToNow(new Date(service.lastCheckedAt)) + ' ago'
            : 'Never checked'}
        </div>
      </div>

      {/* Down / Degraded Live Diagnostic Breakdown */}
      {(service.currentStatus === 'down' || service.currentStatus === 'degraded' || service.lastErrorMessage) && (
        <Card
          className={`border ${
            service.currentStatus === 'down'
              ? 'border-red-500/40 bg-red-500/[0.03]'
              : 'border-amber-500/40 bg-amber-500/[0.03]'
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-base flex items-center gap-2 ${
                service.currentStatus === 'down'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              Live Diagnostic Analysis & Outage Reason
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-background border">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  HTTP Status Code
                </div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {service.lastStatusCode !== undefined ? (
                    service.lastStatusCode === 0 ? (
                      <span className="text-red-600">0 (Timeout)</span>
                    ) : (
                      `HTTP ${service.lastStatusCode}`
                    )
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  Response Latency
                </div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  {service.lastResponseTimeMs !== undefined
                    ? `${service.lastResponseTimeMs.toLocaleString()} ms`
                    : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                  Status Evaluation
                </div>
                <div className="text-base font-bold uppercase font-mono mt-0.5 text-foreground">
                  {service.currentStatus}
                </div>
              </div>
            </div>

            {service.lastErrorMessage && (
              <div className="p-3 rounded-lg bg-background border space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">
                  Reported Error Detail
                </div>
                <div className="font-mono text-xs text-red-600 dark:text-red-400 select-all">
                  {service.lastErrorMessage}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {service.statusEndpoint && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
                    Status / Health Endpoint URL
                  </div>
                  <div className="font-mono text-sm bg-muted/40 p-3 rounded-lg border break-all flex items-center justify-between">
                    <span>{service.statusEndpoint}</span>
                    {service.statusEndpoint.startsWith('http') && (
                      <a href={service.statusEndpoint} target="_blank" rel="noreferrer" className="text-primary hover:underline ml-2">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {service.credentials && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-primary" /> Credentials (Decrypted for Owner)
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowCreds(!showCreds)}>
                      {showCreds ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Decrypted
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-xs bg-muted/40 p-3 rounded-lg border">
                    {showCreds ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap">
                        {typeof service.credentials === 'string'
                          ? service.credentials
                          : JSON.stringify(service.credentials, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground tracking-widest">••••••••••••••••••••••••••••••••</span>
                    )}
                  </div>
                </div>
              )}
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
              <CardTitle>Recent Checks</CardTitle>
            </CardHeader>
            <CardContent>
              {resultsData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No checks recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {resultsData.slice(0, 10).map((result: any) => (
                    <div key={result._id} className="flex items-center justify-between p-2.5 border-b last:border-0 text-sm">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={result.status} size="sm" />
                        <span className="text-muted-foreground text-xs font-mono">
                          {format(new Date(result.checkedAt), 'MMM d, HH:mm:ss')}
                        </span>
                      </div>
                      <div className="font-mono text-xs">
                        {result.responseTimeMs !== undefined ? `${result.responseTimeMs} ms` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize font-medium">{service.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{service.provider}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Check Interval</span>
                <span>Every {service.checkIntervalMinutes || 5} min</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={service.currentStatus} size="sm" />
              </div>
            </CardContent>
          </Card>

          {/* Dependent Projects Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <span>Dependent Projects</span>
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {linkedProjects.length} linked
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Applications relying on {service.name}
              </p>
            </CardHeader>
            <CardContent>
              {linkedProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic text-center">
                  No projects are linked to this service yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedProjects.map((proj: any) => (
                    <div
                      key={proj._id}
                      onClick={() => navigate(`/projects/${proj._id}`)}
                      className="p-2.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between text-xs group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <span className="truncate">{proj.name}</span>
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {proj.environment} • {proj.category || 'App'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={proj.currentStatus} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EditServiceModal service={service} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Service"
        description={`Are you sure you want to delete ${service.name}?`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
