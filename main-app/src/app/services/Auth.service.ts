import apiClient, { saveTokens, clearTokens } from './apiClient';
import type {
  ApiResponse,
  AuthTokens,
  User,
  RegisterPayload,
  LoginPayload,
  Login2FAPayload,
  VerifyAccountPayload,
  ResendOtpPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ConfirmTotpPayload,
  TotpSetup,
} from '../types';

// POST /auth/register
export const register = async (payload: RegisterPayload) => {
  const { data } = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
    '/auth/register',
    payload
  );
  if (data.data?.tokens) saveTokens(data.data.tokens);
  return data.data!;
};

// POST /auth/verify-account
export const verifyAccount = async (payload: VerifyAccountPayload) => {
  const { data } = await apiClient.post<ApiResponse<{ user: User }>>('/auth/verify-account', payload);
  return data.data!;
};

// POST /auth/resend-otp
export const resendOtp = async (payload: ResendOtpPayload) => {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/resend-otp', payload);
  return data;
};

// POST /auth/login
export const login = async (payload: LoginPayload) => {
  const { data } = await apiClient.post<
    ApiResponse<{ user: User; accessToken: string; refreshToken: string; expiresIn: number } | { requires2FA: true; user: User }>
  >('/auth/login', payload);

  if (data.data && 'accessToken' in data.data) {
    
    const tokens = {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
    };
    localStorage.setItem('user', JSON.stringify(data.data.user));
    saveTokens(tokens);
    return { user: data.data.user, tokens, requires2FA: false };
  }
  // 2FA case
  return { requires2FA: true, userId: data.data?.user.id };
};
// POST /auth/login/2fa
export const loginWith2FA = async (payload: Login2FAPayload) => {
  const { data } = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
    '/auth/login/2fa',
    payload
  );
  if (data.data?.tokens) saveTokens(data.data.tokens);
  return { user: data.data?.user, tokens: data.data?.tokens };
};

// POST /auth/refresh
export const refreshTokens = async (refreshToken: string) => {
  const { data } = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
  if (data.data) saveTokens(data.data);
  return data.data!;
};

// POST /auth/forgot-password
export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/forgot-password', payload);
  return data;
};

// POST /auth/reset-password
export const resetPassword = async (payload: ResetPasswordPayload) => {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/reset-password', payload);
  return data;
};

// POST /auth/logout
export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    clearTokens();
  }
};

// POST /auth/logout-all
export const logoutAll = async () => {
  try {
    await apiClient.post('/auth/logout-all');
  } finally {
    clearTokens();
  }
};

// GET /auth/totp/setup
export const getTotpSetup = async () => {
  const { data } = await apiClient.get<ApiResponse<TotpSetup>>('/auth/totp/setup');
  return data.data!;
};

// POST /auth/totp/confirm
export const confirmTotp = async (payload: ConfirmTotpPayload) => {
  const { data } = await apiClient.post<ApiResponse<{ backupCodes: string[] }>>(
    '/auth/totp/confirm',
    payload
  );
  return data.data!;
};

// DELETE /auth/totp
export const removeTotp = async () => {
  const { data } = await apiClient.delete<ApiResponse<null>>('/auth/totp');
  return data;
};

// POST /auth/totp/backup
export const verifyBackupCode = async (userId: string, backupCode: string) => {
  const { data } = await apiClient.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
    '/auth/totp/backup',
    { userId, backupCode }
  );
  if (data.data?.tokens) saveTokens(data.data.tokens);
  return data.data!;
};