import { apiClient } from './axios';
import { ProjectAnalytics, GlobalAnalytics } from '../types';

export const analyticsApi = {
  getProjectAnalytics: (projectId: string, range: '24h' | '7d' | '30d' = '24h') =>
    apiClient.get<ProjectAnalytics>(`/analytics/project/${projectId}?range=${range}`),

  getRealtimeActive: (projectId: string) =>
    apiClient.get<{ realtimeActive: number }>(`/analytics/project/${projectId}/realtime`),

  getGlobalAnalytics: () =>
    apiClient.get<GlobalAnalytics>('/analytics/global'),

  syncProduction: (daysBack: number = 30) =>
    apiClient.post<{ success: boolean; data: any }>('/analytics/sync-production', { daysBack }),
};
