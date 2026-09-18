import { create } from 'zustand';

export interface PulseResult {
  projectId: string;
  projectName: string;
  url: string;
  label: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs: number;
  statusCode: number;
  errorMessage?: string;
}

export interface OutageAlert {
  projectId: string;
  projectName: string;
  url: string;
  urlLabel?: string;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

interface HeartbeatState {
  isConnected: boolean;
  mode: 'safe' | 'live';
  lastPulseTime: number;
  pulseRateMs: number;
  pulseCount: number;
  results: PulseResult[];
  activeOutages: OutageAlert[];
  setIsConnected: (connected: boolean) => void;
  setMode: (mode: 'safe' | 'live') => void;
  setPulseData: (data: { timestamp: number; pulseRateMs: number; mode?: 'safe' | 'live'; results: PulseResult[] }) => void;
  recordOutage: (outage: OutageAlert) => void;
  resolveOutage: (projectId: string, url: string) => void;
}

export const useHeartbeatStore = create<HeartbeatState>((set) => ({
  isConnected: false,
  mode: 'safe',
  lastPulseTime: Date.now(),
  pulseRateMs: 20000,
  pulseCount: 0,
  results: [],
  activeOutages: [],
  setIsConnected: (connected) => set({ isConnected: connected }),
  setMode: (mode) => set({ mode, pulseRateMs: mode === 'live' ? 3000 : 20000 }),
  setPulseData: (data) =>
    set((state) => ({
      isConnected: true,
      mode: data.mode || state.mode,
      lastPulseTime: data.timestamp,
      pulseRateMs: data.pulseRateMs,
      pulseCount: state.pulseCount + 1,
      results: data.results,
    })),
  recordOutage: (outage) =>
    set((state) => ({
      activeOutages: [
        ...state.activeOutages.filter((o) => !(o.projectId === outage.projectId && o.url === outage.url)),
        outage,
      ],
    })),
  resolveOutage: (projectId, url) =>
    set((state) => ({
      activeOutages: state.activeOutages.filter((o) => !(o.projectId === projectId && o.url === url)),
    })),
}));
