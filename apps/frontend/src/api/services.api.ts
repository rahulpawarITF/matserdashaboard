import { apiClient } from './axios';
import { Service, HealthCheckResult } from '../types';

export const servicesApi = {
  list: () => apiClient.get<Service[]>('/services'),
  get: (id: string) => apiClient.get<Service>(`/services/${id}`),
  create: (data: Partial<Service>) => apiClient.post<Service>('/services', data),
  update: (id: string, data: Partial<Service>) => apiClient.patch<Service>(`/services/${id}`, data),
  delete: (id: string) => apiClient.delete(`/services/${id}`),
  triggerCheck: (id: string) => apiClient.post(`/services/${id}/check`),
  check: (id: string) => apiClient.post(`/services/${id}/check`),
  getResults: (id: string) => apiClient.get<HealthCheckResult[]>(`/services/${id}/results`),
};
