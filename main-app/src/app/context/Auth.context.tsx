'use client';

import React, {
  createContext, useContext, useReducer, useEffect,
  useCallback, useRef, type ReactNode,
} from 'react';
import type {
  AuthState, User, AuthTokens,
  LoginPayload, RegisterPayload, Login2FAPayload,
  VerifyAccountPayload, ResendOtpPayload,
  ForgotPasswordPayload, ResetPasswordPayload,
  ConfirmTotpPayload, TotpSetup,
} from '../types';
import * as authService from '../services/Auth.service';
import apiClient from '../services/apiClient';

// ─── State & Actions ──────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'REQUIRES_2FA'; payload: { userId: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'SET_VERIFIED' };

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  requires2FA: false,
  pendingUserId: undefined,
};

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false,
        requires2FA: false,
        pendingUserId: undefined,
      };

    case 'REQUIRES_2FA':
      return {
        ...state,
        isLoading: false,
        requires2FA: true,
        pendingUserId: action.payload.userId,
      };

    case 'LOGOUT':
      return { ...initialState, isLoading: false };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case 'SET_VERIFIED':
      return {
        ...state,
        user: state.user ? { ...state.user, is_verified: true } : null,
      };

    default:
      return state;
  }
}

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<{ requires2FA: boolean }>;
  loginWith2FA: (payload: Login2FAPayload) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  verifyAccount: (payload: VerifyAccountPayload) => Promise<void>;
  resendOtp: (payload: ResendOtpPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  getTotpSetup: () => Promise<TotpSetup>;
  confirmTotp: (payload: ConfirmTotpPayload) => Promise<{ backupCodes: string[] }>;
  removeTotp: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Restore session from stored tokens on mount ───────────────────────────
  useEffect(() => {
    const restore = async () => {
      const raw = localStorage.getItem('auth_tokens');
      if (!raw) { dispatch({ type: 'SET_LOADING', payload: false }); return; }

      try {
        const tokens: AuthTokens = JSON.parse(raw);
        const { data } = await apiClient.get<{ data: User }>('/auth/me', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data.data, tokens } });
      } catch {
        localStorage.removeItem('auth_tokens');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    restore();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const register = useCallback(async (payload: RegisterPayload) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await authService.register(payload);
      dispatch({ type: 'LOGIN_SUCCESS', payload: result });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await authService.login(payload);
      if ('requires2FA' in result && result.requires2FA) {
        dispatch({ type: 'REQUIRES_2FA', payload: { userId: result.userId } });
        return { requires2FA: true };
      }
      dispatch({ type: 'LOGIN_SUCCESS', payload: result as { user: User; tokens: AuthTokens } });
      return { requires2FA: false };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loginWith2FA = useCallback(async (payload: Login2FAPayload) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await authService.loginWith2FA(payload);
      dispatch({ type: 'LOGIN_SUCCESS', payload: result });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    clearTimeout(refreshTimer.current);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll().catch(() => {});
    clearTimeout(refreshTimer.current);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const verifyAccount = useCallback(async (payload: VerifyAccountPayload) => {
    await authService.verifyAccount(payload);
    dispatch({ type: 'SET_VERIFIED' });
  }, []);

  const resendOtp = useCallback(async (payload: ResendOtpPayload) => {
    await authService.resendOtp(payload);
  }, []);

  const forgotPassword = useCallback(async (payload: ForgotPasswordPayload) => {
    await authService.forgotPassword(payload);
  }, []);

  const resetPassword = useCallback(async (payload: ResetPasswordPayload) => {
    await authService.resetPassword(payload);
  }, []);

  const getTotpSetup = useCallback(async () => {
    return authService.getTotpSetup();
  }, []);

  const confirmTotp = useCallback(async (payload: ConfirmTotpPayload) => {
    const result = await authService.confirmTotp(payload);
    dispatch({ type: 'UPDATE_USER', payload: { is_2fa_enabled: true } });
    return result;
  }, []);

  const removeTotp = useCallback(async () => {
    await authService.removeTotp();
    dispatch({ type: 'UPDATE_USER', payload: { is_2fa_enabled: false } });
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        register,
        login,
        loginWith2FA,
        logout,
        logoutAll,
        verifyAccount,
        resendOtp,
        forgotPassword,
        resetPassword,
        getTotpSetup,
        confirmTotp,
        removeTotp,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;