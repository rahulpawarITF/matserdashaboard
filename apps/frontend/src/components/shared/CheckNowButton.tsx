import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { projectsApi } from '@/api/projects.api';
import { servicesApi } from '@/api/services.api';
import { toast } from 'sonner';

interface CheckNowButtonProps {
  targetId: string;
  targetType: 'project' | 'service';
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function CheckNowButton({ targetId, targetType, onSuccess, variant = 'outline', size = 'sm', className }: CheckNowButtonProps) {
  const queryClient = useQueryClient();
  const checkMutation = useMutation({
    mutationFn: () => targetType === 'project' ? projectsApi.triggerCheck(targetId) : servicesApi.triggerCheck(targetId),
    onSuccess: () => {
      toast.success('Health check triggered successfully');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.();
    },
    onError: () => {
      toast.error('Failed to trigger health check');
    }
  });

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={(e) => {
        e.stopPropagation();
        checkMutation.mutate();
      }} 
      disabled={checkMutation.isPending}
      className={className}
    >
      <RotateCw className={`w-4 h-4 ${checkMutation.isPending ? 'animate-spin' : ''} ${size !== 'icon' ? 'mr-2' : ''}`} />
      {size !== 'icon' && 'Check Now'}
    </Button>
  );
}
