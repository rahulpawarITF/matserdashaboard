import { apiClient } from './axios';
import { SystemSettings } from '../types';

export const systemApi = {
  getHealth: () => apiClient.get('/system/health'),
  getSettings: () => apiClient.get<SystemSettings>('/system/settings'),
  updateSettings: (data: Partial<SystemSettings>) => apiClient.patch<SystemSettings>('/system/settings', data),
  exportReport: () => apiClient.get('/system/export-report', { responseType: 'blob' }),
};
