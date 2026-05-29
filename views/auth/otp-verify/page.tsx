'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { AuthCard, Button, OtpInput } from '@/components/ui/Input';

const RESEND_COOLDOWN = 60;

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const { verifyAccount, resendOtp, isLoading } = useAuth();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setError('');
    try {
      await verifyAccount({ email, otp });
      setSuccess('Email verified! Redirecting…');
      setTimeout(() => router.push('/'), 1500);
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Invalid or expired code');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      await resendOtp({ email });
      setSuccess('New code sent!');
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Failed to resend code');
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email || 'your email'}`}
    >
      <form onSubmit={handleVerify} className="flex flex-col gap-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <MailCheck size={32} className="text-amber-500" />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400 text-center">
            {success}
          </div>
        )}

        <OtpInput length={6} value={otp} onChange={setOtp} />

        <Button type="submit" isLoading={isLoading} fullWidth disabled={otp.length < 6}>
          Verify Email
        </Button>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-500">Nao recebeu codigo?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <RefreshCw size={14} className={cooldown > 0 ? '' : 'group-hover:rotate-180 transition-transform'} />
            {cooldown > 0 ? `Reenviar em  ${cooldown}s` : 'reenviar o codigo'}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}