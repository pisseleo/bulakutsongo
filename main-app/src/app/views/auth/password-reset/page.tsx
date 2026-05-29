'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import styles from './reset-password.module.css';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { resetPassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  const validate = () => {
    const e: typeof fieldErrors = {};
    if (!PASSWORD_RE.test(password)) e.password = 'Mínimo 8 caracteres com maiúscula, minúscula e número';
    if (password !== confirm) e.confirm = 'As senhas não coincidem';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError('');
    try {
      await resetPassword({ token, newPassword: password });
      router.push('/views/auth/login?reset=success');
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Falha ao redefinir senha. O link pode ter expirado.');
    }
  };

  const handleGoBack = () => {
    router.push('/views/auth/login');
  };

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <button onClick={handleGoBack} className={styles.backButton}>
            <ArrowLeft size={18} />
            Voltar
          </button>

          <div className={styles.iconWrapper}>
            <div className={styles.errorIcon}>
              <Lock size={40} />
            </div>
          </div>

          <h1 className={styles.title}>Link inválido</h1>
          <p className={styles.subtitle}>
            Este link de recuperação é inválido ou expirou
          </p>

          <Link href="/views/auth/forgot-password" className={styles.requestLink}>
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button onClick={handleGoBack} className={styles.backButton}>
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className={styles.iconWrapper}>
          <div className={styles.iconCircle}>
            <Lock size={40} />
          </div>
        </div>

        <h1 className={styles.title}>Criar nova senha</h1>
        <p className={styles.subtitle}>
          Escolha uma senha forte para a sua conta
        </p>

        {error && (
          <div className={styles.errorAlert}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Nova Senha</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Crie uma senha forte"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className={styles.passwordToggle}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className={styles.fieldError}>{fieldErrors.password}</p>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Confirmar Nova Senha</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirmPass ? 'text' : 'password'}
                placeholder="Repita a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`${styles.input} ${fieldErrors.confirm ? styles.inputError : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className={styles.passwordToggle}
              >
                {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirm && (
              <p className={styles.fieldError}>{fieldErrors.confirm}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? 'A redefinir...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}