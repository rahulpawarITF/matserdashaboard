import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects.api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Server,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveDomainAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuditResultItem {
  projectId: string;
  projectName: string;
  category: string;
  environment: string;
  label: string;
  url: string;
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  status: 'up' | 'degraded' | 'down';
  sslValid: boolean;
  serverHeader: string;
  contentType: string;
  contentLength: string;
  checkedAt: string;
  errorMessage?: string;
}

interface AuditData {
  timestamp: string;
  totalChecked: number;
  upCount: number;
  degradedCount: number;
  downCount: number;
  avgLatencyMs: number;
  allHealthy: boolean;
  results: AuditResultItem[];
}

export function LiveDomainAuditModal({ open, onOpenChange }: LiveDomainAuditModalProps) {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const runAudit = async () => {
    setIsRunning(true);
    try {
      const res = await projectsApi.runLiveDomainAudit();
      const data: AuditData = res.data?.data || res.data;
      setAuditData(data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        `Live Audit Complete: ${data.upCount}/${data.totalChecked} domains operational (avg ${data.avgLatencyMs}ms)`
      );
    } catch (err: any) {
      toast.error('Audit failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsRunning(false);
    }
  };

  const copyReport = () => {
    if (!auditData) return;
    const lines = [
      `=== MASTER DASHBOARD - LIVE DOMAIN AUDIT REPORT ===`,
      `Audited At: ${new Date(auditData.timestamp).toLocaleString()}`,
      `Total Domains: ${auditData.totalChecked} | Operational: ${auditData.upCount} | Degraded: ${auditData.degradedCount} | Down: ${auditData.downCount}`,
      `Average Response Time: ${auditData.avgLatencyMs}ms`,
      `----------------------------------------------------`,
      ...auditData.results.map(
        (r) =>
          `[${r.status.toUpperCase()}] ${r.projectName} (${r.label}) -> ${r.url} | Status: ${r.statusCode} ${r.statusText} | Latency: ${r.responseTimeMs}ms | Server: ${r.serverHeader}`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast.success('Audit report copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Live Domain Health Diagnostic Suite
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Synchronously pings all live domains, verifying real HTTP responses, TLS certificates, and latency.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {auditData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyReport}
                  className="gap-1.5 text-xs h-8"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Report'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={runAudit}
                disabled={isRunning}
                className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'Auditing Domains...' : auditData ? 'Re-run Audit' : 'Run Live Diagnostic Now'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3">
          {/* Summary Stat Cards */}
          {auditData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-card">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium uppercase">Domains Checked</div>
                  <div className="text-2xl font-bold font-mono text-foreground mt-1">
                    {auditData.totalChecked}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {auditData.upCount} / {auditData.totalChecked}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground font-medium uppercase">Avg Latency</div>
                  <div className="text-2xl font-bold font-mono text-foreground mt-1">
                    {auditData.avgLatencyMs} <span className="text-xs font-normal text-muted-foreground">ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-blue-500 font-medium uppercase flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> SSL / HTTPS
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-500 mt-1">
                    {auditData.results.filter((r) => r.sslValid).length} / {auditData.totalChecked}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Audit Results Table */}
          {auditData ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-2.5">Project / Portal</th>
                    <th className="p-2.5">Endpoint URL</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Response Time</th>
                    <th className="p-2.5">Server / TLS</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditData.results.map((r, idx) => {
                    const isExpanded = !!expandedRows[idx];
                    return (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-medium">
                          <div>{r.projectName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.label} &bull; {r.environment}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1 truncate max-w-[220px]"
                          >
                            {r.url.replace(/^https?:\/\//, '')}
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </td>
                        <td className="p-2.5">
                          {r.status === 'up' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium">
                              HTTP {r.statusCode} OK
                            </Badge>
                          ) : r.status === 'degraded' ? (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium">
                              HTTP {r.statusCode} Slow
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-medium">
                              {r.statusCode ? `HTTP ${r.statusCode}` : 'Unreachable'}
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 font-mono">
                          <span
                            className={
                              r.responseTimeMs > 2500
                                ? 'text-amber-500 font-bold'
                                : 'text-emerald-500 font-bold'
                            }
                          >
                            {r.responseTimeMs} ms
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1">
                            {r.sslValid && <ShieldCheck className="w-3 h-3 text-blue-500" />}
                            <span className="truncate max-w-[120px] text-muted-foreground text-[10px]">
                              {r.serverHeader || 'Web Server'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(idx)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Click &quot;Run Live Diagnostic Now&quot; to test every project&apos;s real-time connection.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
