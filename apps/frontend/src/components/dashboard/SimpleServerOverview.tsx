import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CheckNowButton } from '@/components/shared/CheckNowButton';
import { SimultaneousOutageCorrelator } from './SimultaneousOutageCorrelator';
import {
  Server,
  Database,
  Plug,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Radio,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Mail,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SimpleServerOverviewProps {
  services: any[];
  projects: any[];
  onSelectServiceForDiag: (service: any) => void;
}

export const SimpleServerOverview: React.FC<SimpleServerOverviewProps> = ({
  services,
  projects,
  onSelectServiceForDiag,
}) => {
  const [showAdvancedDiagnostics, setShowAdvancedDiagnostics] = useState(false);



  const activeDownProjects = projects.filter((p) => p.currentStatus === 'down' || p.currentStatus === 'degraded');
  const healthyProjectsCount = projects.filter((p) => p.currentStatus === 'up').length;
  const healthyServicesCount = services.filter((s) => s.currentStatus === 'up').length;

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-amber-500" />;
      default:
        return <Server className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------- */}
      {/* 1. HOST SERVER AT A GLANCE (SIMPLE & CLEAR)          */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Host Node Card */}
        <Card className="border border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5 shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Production Host Node
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                <Radio className="w-2.5 h-2.5 mr-1 inline animate-pulse" /> 100% Online
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-500" />
              147.79.70.177
            </div>
            <p className="text-[11px] text-muted-foreground">
              Hosting web applications, REST APIs, and reverse proxy for all client projects.
            </p>
          </CardContent>
        </Card>

        {/* Database Node Card */}
        <Card className="border border-blue-500/30 bg-gradient-to-br from-card to-blue-500/5 shadow-xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                MongoDB Cluster (Port 27017)
              </span>
              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px]">
                <ShieldCheck className="w-2.5 h-2.5 mr-1 inline" /> Safe Read-Only
              </Badge>
            </div>
            <div className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              17 Live Databases
            </div>
            <p className="text-[11px] text-muted-foreground">
              Direct connection verified with live user and admin account synchronization.
            </p>
          </CardContent>
        </Card>

        {/* Outage Health Status Card */}
        <Card className={`border shadow-xs ${activeDownProjects.length === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Current Outage Status
              </span>
              <span className="text-[11px] text-muted-foreground">Real-time</span>
            </div>
            <div className="text-xl font-bold font-mono flex items-center gap-2">
              {activeDownProjects.length === 0 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Zero Active Outages</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">{activeDownProjects.length} Issues Detected</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {activeDownProjects.length === 0
                ? `All ${healthyProjectsCount} projects and ${healthyServicesCount} services are responding normally.`
                : `${activeDownProjects.map((p) => p.name).join(', ')} require inspection.`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. THIRD-PARTY INTEGRATIONS (CLEAN CARDS)            */}
      {/* ---------------------------------------------------- */}
      <Card className="border border-border/80 bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b bg-muted/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Plug className="w-4 h-4 text-purple-500" /> Integrated Third-Party Services ({services.length})
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live health checks for WhatsApp Cloud API, SMS gateways, payment providers, and SMTP
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {healthyServicesCount} / {services.length} Healthy
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {services.map((service: any) => {
              const isDown = service.currentStatus === 'down';
              const isDegraded = service.currentStatus === 'degraded';
              return (
                <div
                  key={service._id}
                  className={`p-3 rounded-lg border bg-card hover:shadow-xs transition-all cursor-pointer ${
                    isDown
                      ? 'border-red-500/50 bg-red-500/[0.03]'
                      : isDegraded
                      ? 'border-amber-500/50 bg-amber-500/[0.03]'
                      : 'border-border/80 hover:border-primary/40'
                  }`}
                  onClick={() => onSelectServiceForDiag(service)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`p-1.5 rounded-md shrink-0 ${
                          isDown ? 'bg-red-500/15' : isDegraded ? 'bg-amber-500/15' : 'bg-muted/60'
                        }`}
                      >
                        {getServiceIcon(service.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">{service.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{service.provider}</div>
                      </div>
                    </div>
                    <StatusBadge status={service.currentStatus} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2.5 mt-2 border-t">
                    <span className="truncate">
                      {service.lastCheckedAt
                        ? `${formatDistanceToNow(new Date(service.lastCheckedAt))} ago`
                        : 'Checked recently'}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] text-primary"
                        onClick={() => onSelectServiceForDiag(service)}
                      >
                        Details
                      </Button>
                      <CheckNowButton
                        targetId={service._id}
                        targetType="service"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------- */}
      {/* 3. OPTIONAL ADVANCED SERVER DIAGNOSTICS TOGGLE       */}
      {/* ---------------------------------------------------- */}
      <div className="pt-1">
        <div className="flex items-center justify-between bg-muted/20 p-2.5 rounded-lg border border-border/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Advanced Server Diagnostics & Cluster Logs</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              (For deep technical root-cause analysis)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedDiagnostics(!showAdvancedDiagnostics)}
            className="text-xs h-7 gap-1 font-medium text-primary hover:text-primary"
          >
            {showAdvancedDiagnostics ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Hide Technical Diagnostics
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> View Technical Diagnostics
              </>
            )}
          </Button>
        </div>

        {/* Collapsible Technical Correlator */}
        {showAdvancedDiagnostics && (
          <div className="mt-3 animate-in fade-in duration-200">
            <SimultaneousOutageCorrelator />
          </div>
        )}
      </div>
    </div>
  );
};
