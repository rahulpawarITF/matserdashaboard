import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const apiClient = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    // If backend envelope is { success: true, data: ... }, unwrap payload directly to response.data
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt token refresh for login or refresh requests themselves
    const isAuthUrl =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthUrl) {
      originalRequest._retry = true;
      try {
        const refreshUrl = `${apiClient.defaults.baseURL || '/api'}/auth/refresh`;
        const res = await axios.post(refreshUrl, {}, { withCredentials: true });
        const newToken = res.data?.data?.accessToken || res.data?.accessToken;

        if (!newToken) throw new Error('No refresh token granted');

        useAuthStore.getState().setToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        useAuthStore.getState().clearAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);
