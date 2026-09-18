import { apiClient } from './axios';
import { DashboardSummary, Incident, RecentChecksResponse, OutageCorrelationResponse } from '../types';

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
  getRecentIncidents: () => apiClient.get<Incident[]>('/dashboard/incidents/recent'),
  getRecentChecks: (params?: {
    timeframe?: 'today' | 'yesterday' | '7d' | '15d' | '30d';
    projectId?: string;
    status?: 'all' | 'up' | 'down' | 'degraded';
    page?: number;
    limit?: number;
  }) => apiClient.get<RecentChecksResponse>('/dashboard/recent-checks', { params }),
  getOutageCorrelation: (params?: {
    timeframe?: 'today' | 'yesterday' | '7d' | '15d' | '30d';
    windowMinutes?: number;
  }) => apiClient.get<OutageCorrelationResponse>('/dashboard/outage-correlation', { params }),
};
