import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthTokens } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ─── Token helpers ────────────────────────────────────────────────────────────

const getTokens = (): AuthTokens | null => {
  
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_tokens');
  return raw ? JSON.parse(raw) : null;
};

export const saveTokens = (tokens: AuthTokens) => {
  console.log('Saving tokens:', tokens);
  localStorage.setItem('auth_tokens', JSON.stringify(tokens));
};

export const clearTokens = () => {
  localStorage.removeItem('auth_tokens');
};

// ─── Request interceptor — attach access token ────────────────────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getTokens();
  if (tokens?.accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// ─── Response interceptor — auto-refresh on 401 ───────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      const tokens = getTokens();
      if (!tokens?.refreshToken) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers!.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<ApiResponse<AuthTokens>>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken: tokens.refreshToken }
        );
        const newTokens = data.data!;
        saveTokens(newTokens);
        processQueue(null, newTokens.accessToken);
        original.headers!.Authorization = `Bearer ${newTokens.accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/views/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;