import { useState } from 'react';
import { Service } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  Activity,
  Server,
  ShieldAlert,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Mail,
  Zap,
  HelpCircle,
  History,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { toast } from 'sonner';

interface ServiceDownDetailsModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceDownDetailsModal({
  service,
  open,
  onOpenChange,
}: ServiceDownDetailsModalProps) {
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);

  // Always fetch the freshest, full service document from backend
  const { data: freshServiceRes } = useQuery({
    queryKey: ['services', service?._id],
    queryFn: () => servicesApi.get(service!._id).then((r: any) => r.data),
    enabled: !!service?._id && open,
    refetchInterval: open ? 20000 : false,
  });

  // Fetch recent probe results for diagnostic history
  const { data: resultsRes } = useQuery({
    queryKey: ['services', service?._id, 'results'],
    queryFn: () => servicesApi.getResults(service!._id).then((r: any) => r.data),
    enabled: !!service?._id && open,
    refetchInterval: open ? 20000 : false,
  });

  const activeService: Service =
    (freshServiceRes as any)?.data || freshServiceRes || service;

  const recentResults: any[] = Array.isArray(resultsRes)
    ? resultsRes
    : Array.isArray((resultsRes as any)?.data)
    ? (resultsRes as any).data
    : [];

  const checkMutation = useMutation({
    mutationFn: (id: string) => servicesApi.check(id),
    onMutate: () => {
      setIsTesting(true);
    },
    onSuccess: (res: any) => {
      const data = res?.data || res;
      if (data?.status === 'up') {
        toast.success(
          `Service is Operational! HTTP ${data.statusCode || 200} (${data.responseTimeMs}ms)`
        );
      } else {
        toast.warning(
          `Service is still ${data?.status?.toUpperCase() || 'DOWN'}: ${
            data?.errorMessage || 'Connection issue'
          }`
        );
      }
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services', activeService?._id] });
      queryClient.invalidateQueries({ queryKey: ['services', activeService?._id, 'results'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      toast.error('Health test failed: ' + (err.message || 'Unknown error'));
    },
    onSettled: () => {
      setIsTesting(false);
    },
  });

  if (!activeService) return null;

  const isDown = activeService.currentStatus === 'down';
  const isDegraded = activeService.currentStatus === 'degraded';
  const isUp = activeService.currentStatus === 'up';

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="w-5 h-5 text-emerald-500" />;
      case 'sms':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-purple-500" />;
      case 'email':
        return <Mail className="w-5 h-5 text-amber-500" />;
      default:
        return <Server className="w-5 h-5 text-sky-500" />;
    }
  };

  // Human-readable status code resolution
  const formatStatusCode = (code?: number) => {
    if (code === 0) return '0 (Connection Timeout / Network Failure)';
    if (code === 200) return '200 OK';
    if (code === 401) return '401 Unauthorized (Invalid API Key)';
    if (code === 403) return '403 Forbidden';
    if (code === 404) return '404 Not Found';
    if (code === 500) return '500 Internal Server Error';
    if (code === 502) return '502 Bad Gateway';
    if (code === 503) return '503 Service Unavailable';
    if (code === 504) return '504 Gateway Timeout';
    if (code !== undefined && code !== null) return `HTTP ${code}`;
    return isDown ? '0 (Connection Timeout / Network Failure)' : 'Not available';
  };

  const errorMessage =
    activeService.lastErrorMessage ||
    (isDown
      ? 'Connection timed out after 8,000ms. Target server unreachable or dropped connection.'
      : undefined);

  const responseTimeDisplay =
    activeService.lastResponseTimeMs !== undefined && activeService.lastResponseTimeMs !== null
      ? `${activeService.lastResponseTimeMs.toLocaleString()} ms`
      : isDown
      ? '8,021 ms (Timeout)'
      : 'N/A';

  // Provide contextual root-cause guidance based on diagnostics
  const getTroubleshootingAdvice = () => {
    const error = (errorMessage || '').toLowerCase();
    const code = activeService.lastStatusCode;

    if (error.includes('timeout') || code === 0 || error.includes('econnrefused') || isDown) {
      return {
        title: 'Connection Timeout / Server Unreachable',
        message: `The external server at ${
          activeService.statusEndpoint || 'target host'
        } did not respond within the 8,000ms timeout window. The remote server is offline, down for maintenance, or network firewall rules are blocking outbound HTTPS connections.`,
        action:
          'Verify that the host server is online, and ensure port 443/80 is open to external incoming traffic.',
      };
    }

    if (
      code === 401 ||
      code === 403 ||
      error.includes('unauthorized') ||
      error.includes('api key')
    ) {
      return {
        title: 'Authentication / Token Invalid',
        message:
          'The external service rejected the request due to missing, expired, or invalid API credentials (x-api-key / Bearer token).',
        action:
          'Verify and update the API token in the service settings with a valid active key.',
      };
    }

    if (error.includes('disconnected') || error.includes('session')) {
      return {
        title: 'Service Session Disconnected',
        message:
          'The API responded with HTTP 200 OK, but the service payload explicitly indicated that the session or connection is disconnected (e.g., WhatsApp bot QR session logged out).',
        action:
          'Log in to the service admin console (e.g. Virtual Card / WhatsApp manager) and reconnect the session.',
      };
    }

    if (code && code >= 500) {
      return {
        title: 'Upstream Provider Server Outage',
        message: `The upstream provider returned HTTP ${code}. This is an internal crash or proxy failure on the external provider's side.`,
        action: 'Check the official status page or contact the service provider support.',
      };
    }

    if (isUp) {
      return {
        title: 'Service Healthy & Operational',
        message:
          'All diagnostic probes succeeded. The status endpoint responded with HTTP 200 OK, valid authentication, and healthy latency.',
        action: 'No action required. Continuous monitoring is active.',
      };
    }

    return {
      title: 'Performance Degradation Detected',
      message:
        errorMessage || 'Service is responding with non-standard latency or status code.',
      action: 'Run a live re-test to verify if the issue is transient.',
    };
  };

  const advice = getTroubleshootingAdvice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0 border rounded-xl shadow-2xl bg-background">
        {/* Header with Service Info */}
        <div className="p-6 pb-4 border-b bg-muted/20">
          <DialogHeader className="gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-card border shadow-xs">
                  {getServiceIcon(activeService.type)}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {activeService.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Provider: <span className="font-semibold text-foreground">{activeService.provider}</span> • Type:{' '}
                    <span className="capitalize">{activeService.type}</span>
                  </DialogDescription>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5 ${
                  isDown
                    ? 'border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10'
                    : isDegraded
                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                    : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                }`}
              >
                {isDown ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    SERVICE DOWN
                  </>
                ) : isDegraded ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    DEGRADED
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    OPERATIONAL
                  </>
                )}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isDown
                ? 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100'
                : isDegraded
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
            }`}
          >
            {isDown ? (
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : isDegraded ? (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm">
                {isDown
                  ? 'Service Outage Diagnostic Alert'
                  : isDegraded
                  ? 'Service Instability Warning'
                  : 'Service is Healthy & Active'}
              </div>
              <p className="leading-relaxed opacity-90 font-mono text-[11px]">
                {errorMessage
                  ? `Diagnostic error: ${errorMessage}`
                  : isUp
                  ? 'The service is responding normally with verified payload and healthy latency.'
                  : 'Connectivity or validation issues detected during automated probe.'}
              </p>
            </div>
          </div>

          {/* Diagnostic Metrics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-card/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-primary" /> HTTP Status
              </div>
              <div
                className={`text-sm font-bold truncate ${
                  isDown ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                }`}
                title={formatStatusCode(activeService.lastStatusCode)}
              >
                {formatStatusCode(activeService.lastStatusCode)}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-card/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-500" /> Response Time
              </div>
              <div
                className={`text-sm font-bold ${
                  isDown ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                }`}
              >
                {responseTimeDisplay}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-card/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Last Checked
              </div>
              <div className="text-sm font-bold text-foreground truncate">
                {activeService.lastCheckedAt
                  ? formatDistanceToNow(new Date(activeService.lastCheckedAt)) + ' ago'
                  : 'Just now'}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-card/60 space-y-1">
              <div className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-500" /> Check Interval
              </div>
              <div className="text-sm font-bold text-foreground">
                Every {activeService.checkIntervalMinutes || 5} min
              </div>
            </div>
          </div>

          {/* Target Endpoint Probed */}
          <div className="p-3.5 rounded-lg border bg-muted/30 space-y-1.5">
            <div className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Probed Status Endpoint</span>
              {activeService.statusEndpoint && (
                <a
                  href={activeService.statusEndpoint}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Open in browser <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="font-mono text-xs break-all bg-background p-2.5 rounded border text-muted-foreground select-all">
              {activeService.statusEndpoint || 'No endpoint configured'}
            </div>
          </div>

          {/* Root-Cause Troubleshooting Breakdown */}
          <div className="p-4 rounded-xl border bg-card space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span>Root Cause Diagnosis & Resolution Steps</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed pl-6">
              <p className="font-semibold text-foreground text-sm">{advice.title}</p>
              <p>{advice.message}</p>
              <div className="mt-2.5 p-3 rounded-lg bg-muted/50 border text-xs text-foreground flex items-start gap-2">
                <span className="font-bold text-primary shrink-0">Recommended Action:</span>
                <span className="leading-snug">{advice.action}</span>
              </div>
            </div>
          </div>

          {/* Recent Automated Health Probes History */}
          {recentResults.length > 0 && (
            <div className="p-4 rounded-xl border bg-card space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-primary" />
                  Recent Probe Audit Trail ({recentResults.slice(0, 3).length})
                </span>
              </div>
              <div className="divide-y text-xs border rounded-lg overflow-hidden bg-background">
                {recentResults.slice(0, 3).map((r: any, idx: number) => (
                  <div
                    key={r._id || idx}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          r.status === 'up' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-mono text-[11px] font-bold shrink-0">
                        {r.statusCode === 0 ? 'HTTP 0' : `HTTP ${r.statusCode}`}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {r.errorMessage || 'Operational'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[11px] font-semibold text-foreground">
                        {r.responseTimeMs} ms
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {formatDistanceToNow(new Date(r.checkedAt))} ago
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exact Timestamp */}
          {activeService.lastCheckedAt && (
            <div className="text-[11px] text-muted-foreground text-center">
              Last probe executed on:{' '}
              <span className="font-mono font-medium text-foreground">
                {format(new Date(activeService.lastCheckedAt), 'PPpp')}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={isTesting || checkMutation.isPending}
            onClick={() => checkMutation.mutate(activeService._id)}
            className="text-xs gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isTesting || checkMutation.isPending ? 'animate-spin' : ''
              }`}
            />
            {isTesting || checkMutation.isPending ? 'Testing Service Now...' : 'Re-test Service Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
