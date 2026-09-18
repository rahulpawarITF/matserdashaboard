import { useQuery } from '@tanstack/react-query';
import { systemApi } from '@/api/system.api';
import { SystemSettings } from '@/types';

export function useSystemSettings() {
  const { data: res, isLoading, error } = useQuery({
    queryKey: ['system', 'settings'],
    queryFn: () => systemApi.getSettings().then((r) => r.data),
    staleTime: 60_000,
  });

  const settings: SystemSettings | undefined = (res as any)?.data || res;

  // Derived dynamic runtime values (in ms)
  const pollingInterval = Math.max(10000, (settings?.dashboardPollingIntervalSeconds ?? 60) * 1000);
  const heartbeatIntervalMs = (settings?.heartbeatIntervalSeconds ?? 60) * 1000;
  const httpTimeoutMs = settings?.httpCheckTimeoutMs ?? 6000;
  const degradedThresholdMs = settings?.httpDegradedThresholdMs ?? 4000;
  const manualCheckTimeoutMs = settings?.manualCheckTimeoutMs ?? 8000;

  return {
    settings,
    isLoading,
    error,
    pollingInterval,
    heartbeatIntervalMs,
    httpTimeoutMs,
    degradedThresholdMs,
    manualCheckTimeoutMs,
  };
}
