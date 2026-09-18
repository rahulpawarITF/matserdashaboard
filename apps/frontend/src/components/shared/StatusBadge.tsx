import { Status } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const isSm = size === 'sm';
  
  const getStatusConfig = () => {
    switch (status) {
      case 'up':
        return { label: 'Good', dotClass: 'bg-emerald-500', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'down':
        return { label: 'Down', dotClass: 'bg-red-500 animate-ping', badgeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20' };
      case 'degraded':
        return { label: 'Warning', dotClass: 'bg-amber-500', badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      default:
        return { label: 'Checking...', dotClass: 'bg-slate-400', badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    }
  };

  const { label, dotClass, badgeClass } = getStatusConfig();

  return (
    <Badge variant="outline" className={cn("gap-1.5 border-transparent font-medium", badgeClass, isSm ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-0.5", className)}>
      <span className={cn("rounded-full", dotClass, isSm ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {label}
    </Badge>
  );
}
