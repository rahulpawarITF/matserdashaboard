import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Edit2, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { CheckNowButton } from '../shared/CheckNowButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { EditServiceModal } from './EditServiceModal';
import { ServiceDownDetailsModal } from './ServiceDownDetailsModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { toast } from 'sonner';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => servicesApi.delete(service._id),
    onSuccess: () => {
      toast.success('Service deleted');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteOpen(false);
    },
    onError: () => toast.error('Failed to delete service'),
  });

  const isDown = service.currentStatus === 'down';
  const isDegraded = service.currentStatus === 'degraded';

  return (
    <>
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full bg-card ${
          isDown ? 'border-red-500/40' : isDegraded ? 'border-amber-500/40' : ''
        }`}
        onClick={() => {
          if (isDown || isDegraded) {
            setDiagnosticsOpen(true);
          } else {
            navigate(`/services/${service._id}`);
          }
        }}
      >
        <CardHeader className="pb-3 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg mb-1">{service.name}</CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="capitalize text-xs font-normal">
                  {service.type}
                </Badge>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setDiagnosticsOpen(true);
                  }}
                  className="cursor-pointer"
                  title="Click to view full diagnostics"
                >
                  <StatusBadge status={service.currentStatus} size="sm" />
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => {
                    setDiagnosticsOpen(true);
                  }}
                >
                  <ShieldAlert className="h-4 w-4 mr-2 text-primary" /> View Diagnostics
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-2">
              <span className="font-medium text-foreground">Provider:</span> {service.provider}
            </div>
            <div className="text-xs text-muted-foreground font-mono truncate mb-2.5 bg-muted/40 p-2 rounded">
              {service.statusEndpoint || 'No endpoint specified'}
            </div>

            {/* Diagnostic Alert Box for Down / Degraded States */}
            {(isDown || isDegraded) && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setDiagnosticsOpen(true);
                }}
                className={`p-2.5 rounded-lg border text-xs mb-3 cursor-pointer transition-colors flex items-start gap-2 ${
                  isDown
                    ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 hover:bg-red-500/15'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold">
                    {isDown ? '🔴 Outage Detected' : '🟡 Degraded Performance'}
                  </div>
                  <div className="truncate text-[11px] opacity-90 font-mono">
                    {service.lastErrorMessage ||
                      (service.lastStatusCode ? `HTTP ${service.lastStatusCode}` : 'Check diagnostics')}
                  </div>
                  <div className="text-[10px] underline font-semibold mt-1">
                    Click to view full down details & diagnostics &rarr;
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
            <span className="truncate">
              {service.lastCheckedAt
                ? `Checked ${formatDistanceToNow(new Date(service.lastCheckedAt))} ago`
                : 'Never checked'}
            </span>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-primary"
                onClick={() => setDiagnosticsOpen(true)}
              >
                Diagnostics
              </Button>
              <CheckNowButton
                targetId={service._id}
                targetType="service"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <EditServiceModal service={service} open={editOpen} onOpenChange={setEditOpen} />
      <ServiceDownDetailsModal
        service={service}
        open={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Service"
        description={`Are you sure you want to delete ${service.name}?`}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
