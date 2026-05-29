'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/Auth.context';
import styles from './login.module.css';

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
  const [totpCode, setTotpCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await login({ email, password });
      // console.log(result)
      if (!result.requires2FA) router.push('/views/chat/chat');
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Email ou senha inválidos');
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
      setError((err as ApiError)?.response?.data?.error || 'Código inválido');
    }
  };

  // Tela de 2FA
  if (requires2FA) {
    return (
      <div className={styles.container}>
        <div className={styles.box}>
          <div className={styles.logo}>🔐</div>
          <h1 className={styles.title}>Autenticação de dois fatores</h1>
          <p className={styles.subtitle}>Digite o código do seu aplicativo autenticador</p>

          {error && <div className={styles.error}>{error}</div>}

          {!useBackup ? (
            <div className={styles.inputGroup}>
              <label>Código de 6 dígitos</label>
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '5px' }}
              />
            </div>
          ) : (
            <div className={styles.inputGroup}>
              <label>Código de Backup</label>
              <input
                type="text"
                placeholder="xxxx-xxxx-xxxx"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
              />
            </div>
          )}

          <button className={styles.button} onClick={handle2FA} disabled={isLoading}>
            {isLoading ? 'A verificar...' : 'Verificar'}
          </button>

          <button
            onClick={() => { setUseBackup(v => !v); setError(''); }}
            className={styles.backupBtn}
          >
            {useBackup ? '← Voltar ao código autenticador' : 'Usar código de backup'}
          </button>
        </div>
      </div>
    );
  }

  // Tela de Login normal
  return (
    <div className={styles.container}>
      <div className={styles.box}>
        <div className={styles.logo}>💬</div>
        <h1 className={styles.title}>BulakutSongo</h1>
        <p className={styles.subtitle}>O teu chat moçambicano</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.inputGroup}>
          <label>Email</label>
          <input 
            type="email" 
            placeholder="seu@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Senha</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className={styles.button} onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'A entrar...' : 'Entrar'}
        </button>

        <div className={styles.divider}></div>

        <div className={styles.links}>
          <Link href="/views/auth/register">Criar conta</Link>
          <Link href="/views/auth/email-verification">Esqueceu a senha?</Link>
        </div>
      </div>
    </div>
  );
}