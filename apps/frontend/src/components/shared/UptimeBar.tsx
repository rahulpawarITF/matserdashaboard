import { HealthCheckResult } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UptimeBarProps {
  results: HealthCheckResult[];
  days?: number;
  className?: string;
}

export function UptimeBar({ results, days = 30, className }: UptimeBarProps) {
  // Pad with empty if < days
  const blocks = [...results].slice(0, days).reverse();
  const upCount = blocks.filter(b => b.status === 'up').length;
  const percentage = blocks.length > 0 ? ((upCount / blocks.length) * 100).toFixed(2) : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{days} days uptime</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="flex items-center gap-1 h-8 w-full">
        <TooltipProvider>
          {Array.from({ length: days }).map((_, i) => {
            const result = blocks[i];
            
            let color = "bg-muted";
            if (result) {
              if (result.status === 'up') color = "bg-green-500";
              else if (result.status === 'down') color = "bg-red-500";
              else if (result.status === 'degraded') color = "bg-yellow-500";
            }

            return (
              <Tooltip key={i}>
                <TooltipTrigger className={cn("flex-1 h-full rounded-sm opacity-80 hover:opacity-100 transition-opacity", color)} />
                <TooltipContent>
                  {result ? (
                    <div className="text-xs">
                      <div className="font-semibold">{format(new Date(result.checkedAt), 'MMM d, yyyy HH:mm')}</div>
                      <div className="capitalize">{result.status}</div>
                      {result.responseTimeMs && <div>{result.responseTimeMs} ms</div>}
                    </div>
                  ) : (
                    <span className="text-xs">No data</span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
