import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalStatusBannerProps {
  downCount: number;
  degradedCount: number;
}

export function GlobalStatusBanner({ downCount, degradedCount }: GlobalStatusBannerProps) {
  if (downCount === 0 && degradedCount === 0) return null;

  const isDown = downCount > 0;
  
  return (
    <div className={cn(
      "w-full px-4 py-3 rounded-lg flex items-center gap-3 mb-6",
      isDown ? "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400" 
             : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
    )}>
      {isDown ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      <div className="font-medium text-sm">
        {isDown 
          ? `Action Required: ${downCount} ${downCount === 1 ? 'system is' : 'systems are'} currently down and require immediate attention.`
          : `Warning: ${degradedCount} ${degradedCount === 1 ? 'system is' : 'systems are'} experiencing degraded performance.`
        }
      </div>
    </div>
  );
}
