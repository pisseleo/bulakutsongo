'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import styles from './verify-email.module.css';

const RESEND_COOLDOWN = 60;

export default function EmailVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Simular envio de email
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage(`Novo email de verificação enviado para ${email || 'seu email'}`);
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setError('Erro ao reenviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/views/auth/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Botão voltar */}
        <button onClick={handleGoToLogin} className={styles.backButton}>
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
        <h1 className={styles.title}>Verifique seu email</h1>
        
        {/* Mensagem */}
        <p className={styles.message}>
          Enviamos um link de verificação para{' '}
          <strong>{email || 'seu email'}</strong>
        </p>
        <p className={styles.subMessage}>
          Clique no link para ativar sua conta e começar a usar o BulakutSongo.
        </p>

        {/* Alertas */}
        {message && (
          <div className={styles.successAlert}>
            <MailCheck size={16} />
            {message}
          </div>
        )}

        {error && (
          <div className={styles.errorAlert}>
            {error}
          </div>
        )}

        {/* Botão reenviar */}
        <button 
          onClick={handleResendEmail} 
          disabled={loading || cooldown > 0}
          className={styles.resendButton}
        >
          <RefreshCw size={16} className={cooldown > 0 ? styles.spinning : ''} />
          {loading 
            ? 'A enviar...' 
            : cooldown > 0 
              ? `Reenviar em ${cooldown}s` 
              : 'Reenviar email de verificação'}
        </button>

        {/* Link para login */}
        <div className={styles.loginLink}>
          <span>Já verificou sua conta? </span>
          <button onClick={handleGoToLogin} className={styles.linkButton}>
            Entrar agora
          </button>
        </div>
      </div>
    </div>
  );
}