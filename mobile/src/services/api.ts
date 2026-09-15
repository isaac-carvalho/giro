import axios from 'axios';
import { StorageService } from './storage';

export const API_HOST = process.env.EXPO_PUBLIC_API_URL || 'https://api.giro.ao';
export const API_BASE_URL = `${API_HOST}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // redes 2G/3G angolanas: curto demais derruba pedidos válidos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

let onUnauthenticated: (() => void) | null = null;
export const setUnauthenticatedHandler = (fn: () => void) => {
  onUnauthenticated = fn;
};

apiClient.interceptors.request.use(async (config) => {
  const token = await StorageService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if ((status === 401 || status === 403) && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await StorageService.getRefreshToken();

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          await StorageService.saveTokens(res.data.accessToken, res.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          await StorageService.clearAuth();
          onUnauthenticated?.();
        }
      } else {
        await StorageService.clearAuth();
        onUnauthenticated?.();
      }
    }
    return Promise.reject(error);
  }
);

export const describeApiError = (e: any, fallback: string) => {
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.code === 'ECONNABORTED') return 'A ligação demorou demais. Verifique a sua rede e tente de novo.';
  if (!e?.response) return 'Sem ligação ao servidor GIRO. Verifique os seus dados móveis.';
  return fallback;
};
