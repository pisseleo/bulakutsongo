'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Eye, EyeOff, AtSign } from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { AuthCard, Input, Button, FormField } from '@components/ui/Input';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}
interface FormErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.displayName.trim()) e.displayName = 'Display name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = '3–20 chars, letters/numbers/underscores only';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!PASSWORD_RE.test(form.password)) e.password = 'Min 8 chars with uppercase, lowercase, and number';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');
    try {
      await register({
        displayName: form.displayName,
        username: form.username,
        email: form.email,
        password: form.password,
      });
      router.push('/verify-email?email=' + encodeURIComponent(form.email));
    } catch (err: unknown) {
      setApiError((err as ApiError)?.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  return (
    <AuthCard title="Criar Conta" subtitle="Comece as conversas em segundos">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {apiError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {apiError}
          </div>
        )}

        <FormField label="Display Name" error={errors.displayName}>
          <Input
            placeholder="How others see you"
            value={form.displayName}
            onChange={set('displayName')}
            icon={<User size={15} />}
            error={errors.displayName}
          />
        </FormField>

        <FormField label="Username" error={errors.username}>
          <Input
            placeholder="your_handle"
            value={form.username}
            onChange={set('username')}
            icon={<AtSign size={15} />}
            error={errors.username}
            autoCapitalize="none"
          />
        </FormField>

        <FormField label="Email" error={errors.email}>
          <Input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
            icon={<Mail size={15} />}
            error={errors.email}
          />
        </FormField>

        <FormField label="Password" error={errors.password}>
          <Input
            type={showPass ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={form.password}
            onChange={set('password')}
            icon={<Lock size={15} />}
            error={errors.password}
            rightIcon={
              <button type="button" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          {/* Strength meter */}
          {form.password && (
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= strength
                    ? strength <= 1 ? 'bg-red-500'
                    : strength === 2 ? 'bg-amber-500'
                    : strength === 3 ? 'bg-yellow-400'
                    : 'bg-green-500'
                    : 'bg-zinc-800'
                }`} />
              ))}
            </div>
          )}
        </FormField>

        <FormField label="Confirm Password" error={errors.confirmPassword}>
          <Input
            type="password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            icon={<Lock size={15} />}
            error={errors.confirmPassword}
          />
        </FormField>

        <Button type="submit" isLoading={isLoading} fullWidth className="mt-1">
          Create Account
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Se ja tem conta?{' '}
          <Link href="/views/auth/login" className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
            entrar
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}