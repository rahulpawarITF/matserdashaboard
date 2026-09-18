import { apiClient } from './axios';
import { Project, HealthCheckResult, UptimeStats, Incident } from '../types';

interface ProjectListResponse {
  data: Project[];
  projects?: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}
interface HealthResultsResponse { data: HealthCheckResult[]; total: number; }

export const projectsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; tag?: string; environment?: string; status?: string }) =>
    apiClient.get<ProjectListResponse>('/projects', { params }),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => apiClient.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => apiClient.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => apiClient.delete(`/projects/${id}`),
  triggerCheck: (id: string) => apiClient.post(`/projects/${id}/check`),
  checkNow: (id: string) => apiClient.post(`/projects/${id}/check`),
  getResults: (id: string, params?: { page?: number; limit?: number; urlLabel?: string }) =>
    apiClient.get<HealthResultsResponse>(`/projects/${id}/results`, { params }),
  getUptime: (id: string) => apiClient.get<UptimeStats>(`/projects/${id}/uptime`),
  getIncidents: (id: string) => apiClient.get<Incident[]>(`/projects/${id}/incidents`),
  runLiveDomainAudit: () => apiClient.post<{ success: boolean; data: any }>('/projects/live-status-audit'),
};
