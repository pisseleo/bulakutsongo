import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res: AxiosResponse) => res,
 async (err: AxiosError) => {
  const original = err.config as AxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            { refreshToken: refresh }
          );
          localStorage.setItem('access_token', data.data.accessToken);
          localStorage.setItem('refresh_token', data.data.refreshToken);
          if (original.headers) {
            original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          }
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth endpoints ─────────────────────────────────────────────────────────
export const authApi = {
  register: (body: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', body),
  login: (body: { email: string; password: string }) =>
    api.post('/auth/login', body),
  login2fa: (body: { userId: string; code: string }) =>
    api.post('/auth/login/2fa', body),
  verifyAccount: (body: { email: string; otp: string }) =>
    api.post('/auth/verify-account', body),
  resendOtp: (body: { email: string }) =>
    api.post('/auth/resend-otp', body),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (body: { token: string; password: string }) =>
    api.post('/auth/reset-password', body),
};

// ── User endpoints ─────────────────────────────────────────────────────────
export const userApi = {
  me: () => api.get('/users/me'),
  updateMe: (body: { full_name?: string; profile_picture_url?: string }) =>
    api.patch('/users/me', body),
};

// ── Conversation endpoints ─────────────────────────────────────────────────
export const conversationApi = {
  create: (body: { name?: string; memberIds: string[]; isGroup?: boolean }) =>
    api.post('/conversations', body),
  list: () => api.get('/conversations'),
  get: (id: string) => api.get(`/conversations/${id}`),
  addMember: (id: string, userId: string) =>
    api.post(`/conversations/${id}/members`, { userId }),
  removeMember: (id: string, memberId: string) =>
    api.delete(`/conversations/${id}/members/${memberId}`),
};

// ── Message endpoints ──────────────────────────────────────────────────────
export const messageApi = {
  send: (body: { conversationId: string; content: string; type?: string }, file?: File) => {
    const form = new FormData();
    Object.entries(body).forEach(([k, v]) => form.append(k, v as string));
    if (file) form.append('file', file);
    return api.post('/messages', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: (conversationId: string, cursor?: string) =>
    api.get(`/messages/conversation/${conversationId}`, { params: { cursor } }),
  markRead: (id: string) => api.post(`/messages/${id}/read`),
  delete: (id: string) => api.delete(`/messages/${id}`),
};

// ── Upload endpoint ────────────────────────────────────────────────────────
export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;