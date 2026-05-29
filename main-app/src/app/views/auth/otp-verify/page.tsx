'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { OtpInput } from '@/components/ui/Input';
import styles from './verify-email.module.css';

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
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Digite os 6 dígitos do código');
      return;
    }
    setError('');
    try {
      await verifyAccount({ email, otp });
      setSuccess('Email verificado com sucesso! Redirecionando...');
      setTimeout(() => router.push('/views/chat/chat'), 1500);
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Código inválido ou expirado');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      await resendOtp({ email, purpose: 'ACCOUNT_VERIFICATION' });
      setSuccess('Novo código enviado!');
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Erro ao reenviar código');
    }
  };

  const handleGoBack = () => {
    router.push('/views/auth/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Botão voltar */}
        <button onClick={handleGoBack} className={styles.backButton}>
          <ArrowLeft size={18} />
          Voltar
        </button>

        {/* Ícone */}
        <div className={styles.iconWrapper}>
          <div className={styles.iconCircle}>
            <MailCheck size={40} />
          </div>
        </div>

        {/* Título */}
        <h1 className={styles.title}>Verificar seu email</h1>
        <p className={styles.message}>
          Enviamos um código de 6 dígitos para{' '}
          <strong>{email || 'seu email'}</strong>
        </p>

        {/* Alertas */}
        {error && (
          <div className={styles.errorAlert}>
            {error}
          </div>
        )}
        {success && (
          <div className={styles.successAlert}>
            <MailCheck size={16} />
            {success}
          </div>
        )}

        {/* Formulário OTP */}
        <form onSubmit={handleVerify} className={styles.form}>
          <label className={styles.otpLabel}>
            Código de verificação
          </label>
          <OtpInput 
            length={6} 
            value={otp} 
            onChange={setOtp} 
          />
          <p className={styles.otpHint}>
            Digite os 6 dígitos que enviámos para o seu email
          </p>

          <button 
            type="submit" 
            disabled={isLoading || otp.length < 6}
            className={styles.verifyButton}
          >
            {isLoading ? 'A verificar...' : 'Verificar Email'}
          </button>
        </form>

        {/* Reenviar código */}
        <div className={styles.resendSection}>
          <p className={styles.resendText}>Não recebeu o código?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className={styles.resendButton}
          >
            <RefreshCw size={14} className={cooldown > 0 ? styles.spinning : ''} />
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </button>
        </div>
      </div>
    </div>
  );
}