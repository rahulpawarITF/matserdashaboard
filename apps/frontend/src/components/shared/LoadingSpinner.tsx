import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = 'md', className, fullPage = false }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }[size];

  const spinner = <Loader2 className={cn("animate-spin text-primary", sizeClass, className)} />;

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full h-full">
        {spinner}
      </div>
    );
  }

  return spinner;
}
