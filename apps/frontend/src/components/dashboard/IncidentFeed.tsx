import { Incident } from '@/types';
import { formatDistanceToNow, format } from 'date-fns';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '../shared/EmptyState';

export function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  if (!incidents || incidents.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            icon={<CheckCircle2 className="w-8 h-8 text-green-500" />} 
            title="All clear" 
            description="No recent incidents reported in the system." 
            className="border-none shadow-none"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          Recent Incidents
          <Badge variant="secondary">{incidents.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] px-6">
          <div className="space-y-6 pb-6">
            {incidents.map((incident) => {
              const isOpen = !incident.isResolved;
              
              return (
                <div key={incident._id} className={`flex gap-4 relative pl-4 border-l-2 ${isOpen ? 'border-red-500' : 'border-muted'}`}>
                  <div className={`absolute -left-[11px] p-1 rounded-full bg-background border-2 ${isOpen ? 'border-red-500 text-red-500' : 'border-muted text-muted-foreground'}`}>
                    {incident.severity === 'critical' ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  </div>
                  
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-sm">
                        {incident.targetType === 'project' ? 'Project' : 'Service'} Incident
                      </div>
                      <Badge variant={isOpen ? "destructive" : "secondary"} className="text-[10px] h-5">
                        {isOpen ? 'OPEN' : 'RESOLVED'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{incident.summary}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(incident.startedAt), 'MMM d, HH:mm')}</span>
                      <span>•</span>
                      {isOpen ? (
                        <span className="text-red-500 font-medium">
                          Ongoing for {formatDistanceToNow(new Date(incident.startedAt))}
                        </span>
                      ) : (
                        <span>Resolved {formatDistanceToNow(new Date(incident.resolvedAt!))} ago</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
