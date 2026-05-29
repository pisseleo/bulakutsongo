'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/Auth.context';
import { AuthCard, Input, Button, FormField } from '@components/ui/Input';

// ─── Forgot Password Page ─────────────────────────────────────────────────────
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}
export function ForgotPasswordPage() {
  const { forgotPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await forgotPassword({ email });
      setSent(true);
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Failed to send reset email');
    }
  };

  if (sent) {
    return (
      <AuthCard title="Check your inbox" subtitle="We've sent password reset instructions">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-400">
              We sent a reset link to{' '}
              <span className="text-white font-medium">{email}</span>
            </p>
            <p className="text-xs text-zinc-600 mt-2">
              Check your spam folder if you dont see it within a few minutes.
            </p>
          </div>
          <Link href="/login"
            className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 font-medium transition-colors">
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password" subtitle="Enter your email and we'll send a reset link">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <FormField label="Email">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<Mail size={15} />}
            required
          />
        </FormField>

        <Button type="submit" isLoading={isLoading} fullWidth>
          Send Reset Link
        </Button>

        <Link href="/login"
          className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-amber-500 transition-colors">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </form>
    </AuthCard>
  );
}

// ─── Reset Password Page ──────────────────────────────────────────────────────

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { resetPassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  const validate = () => {
    const e: typeof fieldErrors = {};
    if (!PASSWORD_RE.test(password)) e.password = 'Min 8 chars with uppercase, lowercase, and number';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    try {
      await resetPassword({ token, newPassword: password });
      router.push('/login?reset=success');
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Reset failed. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This password reset link is invalid or expired">
        <div className="text-center py-4">
          <Link href="/forgot-password"
            className="text-amber-500 hover:text-amber-400 text-sm font-medium">
            Request a new reset link
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set new password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <FormField label="New Password" error={fieldErrors.password}>
          <Input
            type={showPass ? 'text' : 'password'}
            placeholder="Create a new password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock size={15} />}
            error={fieldErrors.password}
            rightIcon={
              <button type="button" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </FormField>

        <FormField label="Confirm New Password" error={fieldErrors.confirm}>
          <Input
            type="password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            icon={<Lock size={15} />}
            error={fieldErrors.confirm}
          />
        </FormField>

        <Button type="submit" isLoading={isLoading} fullWidth>
          Reset Password
        </Button>
      </form>
    </AuthCard>
  );
}