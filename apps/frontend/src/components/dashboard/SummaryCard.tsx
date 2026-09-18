import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple';
  subtitle?: string;
}

export function SummaryCard({ title, value, icon, color, subtitle }: SummaryCardProps) {
  const colorStyles = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    yellow: 'bg-amber-500/10 text-amber-500',
    gray: 'bg-gray-500/10 text-gray-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <Card className="hover:border-primary/30 transition-all shadow-xs">
      <CardContent className="p-4 flex items-center gap-3.5">
        <div className={cn("p-3 rounded-xl flex items-center justify-center shrink-0", colorStyles[color])}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{title}</p>
          <h3 className="text-xl font-bold text-foreground truncate mt-0.5">{value}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
