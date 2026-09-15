import axios from 'axios';
import { StorageService } from './storage';

export const API_BASE_URL = 'https://api.giro.ao/api/v1'; // Ou IP local em desenvolvimento

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000, // Timeout curto otimizado para redes instáveis (2G/3G)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor de Requisição: Injeta Access Token
apiClient.interceptors.request.use(async (config) => {
  const token = await StorageService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor de Resposta: Renovação Automática de Token (Refresh Token)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await StorageService.getRefreshToken();
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          await StorageService.saveTokens(res.data.accessToken, res.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        await StorageService.clearAuth();
      }
    }
    return Promise.reject(error);
  }
);
