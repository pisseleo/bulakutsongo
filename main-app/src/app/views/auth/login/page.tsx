'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../context/Auth.context';
import { AuthCard, Button, FormField, Input, OtpInput } from '@/components/ui/Input';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWith2FA, pendingUserId, requires2FA, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login({ email, password });
      if (!result.requires2FA) router.push('/');
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Invalid email or password');
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pendingUserId) return;
    try {
      await loginWith2FA({
        userId: pendingUserId,
        totpCode: useBackup ? undefined : totpCode,
        backupCode: useBackup ? backupCode : undefined,
      });
      router.push('/');
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Invalid code');
    }
  };

  if (requires2FA) {
    return (
      <AuthCard
        title="Autenticação de dois fatores"
        subtitle="Digite o código do seu aplicativo autenticador ou use um código de backup"
      >
        <form onSubmit={handle2FA} className="flex flex-col gap-5">
          <div className="flex justify-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShieldCheck size={28} className="text-amber-500" />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          {!useBackup ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-zinc-500 text-center uppercase tracking-widest font-semibold">
                6 digitos do aplicativo autenticador
              </p>
              <OtpInput length={6} value={totpCode} onChange={setTotpCode} error={undefined} />
            </div>
          ) : (
            <FormField label="Backup Code">
              <Input
                placeholder="xxxxxxxx-xxxx-xxxx"
                value={backupCode}
                onChange={e => setBackupCode(e.target.value)}
                icon={<ShieldCheck size={15} />}
              />
            </FormField>
          )}

          <Button type="submit" isLoading={isLoading} fullWidth>
            Verify
          </Button>

          <button
            type="button"
            onClick={() => { setUseBackup(v => !v); setError(''); }}
            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors text-center"
          >
            {useBackup ? '← Back to authenticator code' : 'Use backup code instead'}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Benvindo de volta" subtitle="Entra na comunidade e inicie conversas instantaneas">
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
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

        <FormField label="Password">
          <Input
            type={showPass ? 'text' : 'password'}
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            icon={<Lock size={15} />}
            required
            rightIcon={
              <button type="button" onClick={() => setShowPass(v => !v)} className="focus:outline-none">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
        </FormField>

        <div className="flex justify-end -mt-2">
          <Link href="/views/auth/forgot-password"
            className="text-xs text-zinc-500 hover:text-amber-500 transition-colors">
            Esqueceu a senha?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading} fullWidth>
          Entrar
        </Button>

        <div className="relative flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-zinc-900" />
          <span className="text-xs text-zinc-700">or</span>
          <div className="flex-1 h-px bg-zinc-900" />
        </div>

        <p className="text-center text-sm text-zinc-500">
          Se nao tiver conta{' '}
          <Link href="/views/auth/register" className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
            cadastre-se
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}