import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useHeartbeatStore } from '../stores/heartbeatStore';

// Web Audio API chime synthesizer (No external audio files needed)
function playChime(isAlert: boolean = false) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isAlert) {
      // Urgent double beep for outage
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Pleasant chime for recovery
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Audio may be blocked before first user gesture
  }
}

let activeSocket: Socket | null = null;

export const emitHeartbeatMode = (mode: 'safe' | 'live') => {
  if (activeSocket && activeSocket.connected) {
    activeSocket.emit('heartbeat:set-mode', { mode });
  }
};

export const useSocket = (queryClient: QueryClient) => {
  const socketRef = useRef<Socket | null>(null);
  const { setIsConnected, setMode, setPulseData, recordOutage, resolveOutage } = useHeartbeatStore();

  useEffect(() => {
    const socketUrl = (import.meta as any).env?.VITE_SOCKET_URL || '';
    socketRef.current = io(socketUrl, {
      reconnection: true,
      transports: ['polling', 'websocket'],
    });

    const socket = socketRef.current;
    activeSocket = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('heartbeat:mode-changed', (data: any) => {
      if (data?.mode) {
        setMode(data.mode);
      }
    });

    // 1-Second Continuous Heartbeat Pulse Stream
    socket.on('heartbeat:pulse', (data: any) => {
      setPulseData(data);
    });

    // Instant In-Memory Cache Mutator (0ms latency, zero extra HTTP requests)
    const updateProjectInCache = (targetId: string, newStatus: string, latency?: number, checkedAt?: string) => {
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old) return old;
        const mutate = (p: any) => {
          if (!p) return p;
          const pId = String(p._id || p.id);
          if (pId === targetId) {
            return {
              ...p,
              currentStatus: newStatus,
              latestResponseTimeMs: latency !== undefined ? latency : p.latestResponseTimeMs,
              lastCheckedAt: checkedAt || new Date().toISOString(),
            };
          }
          return p;
        };

        if (Array.isArray(old)) return old.map(mutate);
        if (Array.isArray(old.data)) return { ...old, data: old.data.map(mutate) };
        if (Array.isArray(old.projects)) return { ...old, projects: old.projects.map(mutate) };
        if (old.data && typeof old.data === 'object') return { ...old, data: mutate(old.data) };
        if (typeof old === 'object' && String(old._id || old.id) === targetId) return mutate(old);
        return old;
      });
    };

    const updateServiceInCache = (
      targetId: string,
      newStatus: string,
      latency?: number,
      checkedAt?: string,
      statusCode?: number,
      errorMessage?: string
    ) => {
      queryClient.setQueriesData({ queryKey: ['services'] }, (old: any) => {
        if (!old) return old;
        const mutate = (s: any) => {
          if (!s || typeof s !== 'object') return s;
          const sId = String(s._id || s.id);
          if (sId === targetId) {
            return {
              ...s,
              currentStatus: newStatus,
              lastResponseTimeMs: latency !== undefined ? latency : s.lastResponseTimeMs,
              lastStatusCode: statusCode !== undefined ? statusCode : s.lastStatusCode,
              lastErrorMessage: errorMessage !== undefined ? errorMessage : s.lastErrorMessage,
              lastCheckedAt: checkedAt || new Date().toISOString(),
            };
          }
          return s;
        };

        if (Array.isArray(old)) return old.map(mutate);
        if (Array.isArray(old.data)) return { ...old, data: old.data.map(mutate) };
        if (old.data && typeof old.data === 'object') return { ...old, data: mutate(old.data) };
        if (typeof old === 'object') return mutate(old);
        return old;
      });
    };

    // Deep Synchronizer: Updates the status of third-party services linked inside any project
    const updateLinkedServicesInProjectCache = (
      serviceId: string,
      newStatus: string,
      latency?: number,
      statusCode?: number,
      errorMessage?: string,
      checkedAt?: string
    ) => {
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old) return old;

        const mutateProject = (p: any) => {
          if (!p || typeof p !== 'object') return p;
          let changed = false;

          // 1. Mutate linkedServices array if present
          let updatedLinkedServices = p.linkedServices;
          if (Array.isArray(p.linkedServices)) {
            updatedLinkedServices = p.linkedServices.map((svc: any) => {
              const sId = String(svc?._id || svc?.id || svc);
              if (sId === serviceId) {
                changed = true;
                return {
                  ...svc,
                  currentStatus: newStatus,
                  lastResponseTimeMs: latency !== undefined ? latency : svc.lastResponseTimeMs,
                  lastStatusCode: statusCode !== undefined ? statusCode : svc.lastStatusCode,
                  lastErrorMessage: errorMessage !== undefined ? errorMessage : svc.lastErrorMessage,
                  lastCheckedAt: checkedAt || new Date().toISOString(),
                };
              }
              return svc;
            });
          }

          // 2. Mutate linkedServiceIds array if populated
          let updatedLinkedServiceIds = p.linkedServiceIds;
          if (Array.isArray(p.linkedServiceIds)) {
            updatedLinkedServiceIds = p.linkedServiceIds.map((ls: any) => {
              if (typeof ls === 'object' && ls !== null) {
                const sId = String(ls._id || ls.id);
                if (sId === serviceId) {
                  changed = true;
                  return {
                    ...ls,
                    currentStatus: newStatus,
                    lastResponseTimeMs: latency !== undefined ? latency : ls.lastResponseTimeMs,
                    lastStatusCode: statusCode !== undefined ? statusCode : ls.lastStatusCode,
                    lastErrorMessage: errorMessage !== undefined ? errorMessage : ls.lastErrorMessage,
                    lastCheckedAt: checkedAt || new Date().toISOString(),
                  };
                }
              }
              return ls;
            });
          }

          if (!updatedLinkedServices && updatedLinkedServiceIds) {
            updatedLinkedServices = updatedLinkedServiceIds;
          }

          if (!changed) return p;

          return {
            ...p,
            linkedServices: updatedLinkedServices,
            linkedServiceIds: updatedLinkedServiceIds,
          };
        };

        if (Array.isArray(old)) return old.map(mutateProject);
        if (Array.isArray(old.data)) return { ...old, data: old.data.map(mutateProject) };
        if (Array.isArray(old.projects)) return { ...old, projects: old.projects.map(mutateProject) };
        if (old.data && typeof old.data === 'object') return { ...old, data: mutateProject(old.data) };
        if (typeof old === 'object') return mutateProject(old);
        return old;
      });
    };

    // Instant Outage and Recovery Alerts
    socket.on('heartbeat:alert', (alert: any) => {
      if (!alert) return;
      const targetId = String(alert.targetId || alert.projectId || '');
      const targetType = alert.targetType || 'project';
      const isOutage = alert.type === 'outage';
      const newStatus = isOutage ? 'down' : 'up';
      const targetName = alert.name || alert.projectName || 'Service';

      if (isOutage) {
        recordOutage(alert);
        playChime(true);
        toast.error(`🚨 OUTAGE DETECTED: ${targetName} is DOWN!`, {
          description: `${alert.urlLabel || alert.url || 'Service'}: ${alert.error || 'No response'}`,
          duration: 10000,
        });
      } else {
        resolveOutage(alert.projectId || alert.targetId, alert.url);
        playChime(false);
        toast.success(`✅ RECOVERED: ${targetName} is back UP!`, {
          description: `Latency: ${alert.responseTimeMs}ms (HTTP ${alert.statusCode})`,
          duration: 6000,
        });
      }

      if (targetType === 'service') {
        updateServiceInCache(targetId, newStatus, alert.responseTimeMs, undefined, alert.statusCode, alert.error);
        updateLinkedServicesInProjectCache(targetId, newStatus, alert.responseTimeMs, alert.statusCode, alert.error);
      } else {
        updateProjectInCache(targetId, newStatus, alert.responseTimeMs);
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'incidents'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['services'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['projects'], refetchType: 'active' });
    });

    // Real-Time Status Update Stream
    socket.on('status:update', (data: any) => {
      if (!data) return;
      const targetId = String(data.targetId || '');
      const targetType = data.targetType || 'project';
      const newStatus = data.status;
      const latency = data.responseTimeMs;
      const statusCode = data.statusCode;
      const errorMessage = data.errorMessage;
      const checkedAt = data.checkedAt || new Date().toISOString();

      if (targetType === 'project') {
        updateProjectInCache(targetId, newStatus, latency, checkedAt);
      } else {
        // 1. Update service queries in real time
        updateServiceInCache(targetId, newStatus, latency, checkedAt, statusCode, errorMessage);
        // 2. Update all projects that depend on this service in real time
        updateLinkedServicesInProjectCache(targetId, newStatus, latency, statusCode, errorMessage, checkedAt);
      }

      // Synchronize in background
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['services'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['projects'], refetchType: 'active' });
    });

    socket.on('incident:new', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'incidents'], refetchType: 'active' });
      playChime(true);
      toast.error(`New Incident: ${data.summary}`);
    });

    socket.on('incident:resolved', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'incidents'], refetchType: 'active' });
      playChime(false);
      toast.success('Incident resolved');
    });

    socket.on('alert:fired', (data: any) => {
      toast.warning(`Alert: ${data.message}`);
    });

    // Real-time system settings hot-reload stream
    socket.on('settings:update', (updatedSettings: any) => {
      queryClient.setQueryData(['system', 'settings'], (old: any) => {
        if (!old) return { data: updatedSettings };
        return { ...old, data: { ...(old.data || old), ...updatedSettings } };
      });
      queryClient.invalidateQueries({ queryKey: ['system', 'settings'] });
      toast.info('System configuration updated dynamically');
    });

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [queryClient, setIsConnected, setPulseData, recordOutage, resolveOutage]);
};
