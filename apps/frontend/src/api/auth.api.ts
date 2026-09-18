import { apiClient } from './axios';
import { User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{ accessToken: string; user: User }>('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get<User>('/auth/me'),
  refresh: () => apiClient.post<{ accessToken: string }>('/auth/refresh'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch('/auth/me/password', { currentPassword, newPassword }),
};
