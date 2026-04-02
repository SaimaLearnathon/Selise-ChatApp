import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost/api/auth';
// Extract base API URL (e.g., https://.../api) and ensure it ends with a slash
const API_URL = AUTH_URL.replace(/\/auth\/?$/, '') + '/';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log(error)
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        const response = await axios.post(
          `${AUTH_URL}/refresh`,
          {},
          { withCredentials: true }
        );
        // Assuming the response returns an access token natively in data.accessToken or data.data.accessToken
        const accessToken = response.data?.data?.accessToken || response.data?.accessToken;
        if (accessToken) {
          useAuthStore.getState().setToken(accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } else {
          throw new Error('No access token returned');
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
