'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/Auth.context';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ email });
      setMessage('Se um usuário com esse email existir, um link de redefinição foi enviado.');
    } catch (err: unknown) {
      setError((err as ApiError)?.response?.data?.error || 'Falha ao solicitar redefinição de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

        .fp-root {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #128C7E;
          background-image:
            radial-gradient(ellipse 70% 50% at 15% 10%, rgba(255,255,255,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 85% 90%, rgba(0,0,0,0.15) 0%, transparent 55%);
          font-family: 'DM Sans', sans-serif;
          padding: 1.5rem;
        }

        .fp-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 20px;
          padding: 2.75rem 2.5rem;
          box-shadow:
            0 2px 0 rgba(0,0,0,0.06),
            0 24px 64px rgba(0,0,0,0.22),
            0 8px 24px rgba(0,0,0,0.12);
          animation: fp-rise 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }

        @keyframes fp-rise {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Brand logo block ── */
        .fp-brand {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 2rem;
        }

        .fp-brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #128C7E;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(18,140,126,0.35);
        }

        .fp-brand-name {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.04em;
          color: #128C7E;
          line-height: 1;
        }

        .fp-brand-tagline {
          font-size: 0.65rem;
          font-weight: 400;
          color: #94a3b8;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 2px;
        }

        /* ── Header ── */
        .fp-lock-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(18,140,126,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .fp-heading {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.6rem;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 0 0 0.5rem;
        }

        .fp-sub {
          color: #64748b;
          font-size: 0.85rem;
          line-height: 1.6;
          font-weight: 400;
          margin: 0 0 1.75rem;
        }

        .fp-divider {
          height: 1px;
          background: #e2e8f0;
          margin-bottom: 1.75rem;
        }

        /* ── Input ── */
        .fp-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 0.45rem;
        }

        .fp-input-wrap {
          position: relative;
          margin-bottom: 1.25rem;
        }

        .fp-input {
          width: 100%;
          box-sizing: border-box;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.85rem 1rem 0.85rem 2.75rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }

        .fp-input::placeholder { color: #cbd5e1; }

        .fp-input:focus {
          border-color: #128C7E;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(18,140,126,0.12);
        }

        .fp-input-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: #cbd5e1;
          pointer-events: none;
          transition: color 0.2s;
        }

        .fp-input-wrap:focus-within .fp-input-icon {
          color: #128C7E;
        }

        /* ── Button ── */
        .fp-btn {
          width: 100%;
          padding: 0.9rem 1.5rem;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          letter-spacing: 0.02em;
          background: #128C7E;
          color: #fff;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(18,140,126,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .fp-btn:hover:not(:disabled) {
          background: #0e7a6d;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(18,140,126,0.38);
        }

        .fp-btn:active:not(:disabled) { transform: translateY(0); }
        .fp-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .fp-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: fp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes fp-spin { to { transform: rotate(360deg); } }

        /* ── Alerts ── */
        .fp-alert {
          border-radius: 10px;
          padding: 0.8rem 0.95rem;
          font-size: 0.82rem;
          line-height: 1.5;
          margin-top: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          animation: fp-rise 0.3s ease both;
        }

        .fp-alert-success {
          background: rgba(18,140,126,0.08);
          border: 1px solid rgba(18,140,126,0.25);
          color: #0a7060;
        }

        .fp-alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }

        /* ── Back link ── */
        .fp-back {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          margin-top: 1.5rem;
          color: #94a3b8;
          font-size: 0.8rem;
          text-decoration: none;
          transition: color 0.2s;
        }

        .fp-back:hover { color: #128C7E; }
        .fp-back svg { transition: transform 0.2s; }
        .fp-back:hover svg { transform: translateX(-3px); }

        @media (max-width: 480px) {
          .fp-card { padding: 2rem 1.5rem; border-radius: 16px; }
          .fp-heading { font-size: 1.4rem; }
        }
      `}</style>

      <div className="fp-root">
        <div className="fp-card">

          {/* Brand */}
          <div className="fp-brand">
            <div className="fp-brand-icon">
              {/* Chat bubble icon representing BulakutSongo */}
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="rgba(255,255,255,0.9)" stroke="none"/>
                <circle cx="8" cy="10" r="1.2" fill="#128C7E"/>
                <circle cx="12" cy="10" r="1.2" fill="#128C7E"/>
                <circle cx="16" cy="10" r="1.2" fill="#128C7E"/>
              </svg>
            </div>
            <div>
              <div className="fp-brand-name">BULAKUTSONGO</div>
              <div className="fp-brand-tagline">Mensagens seguras</div>
            </div>
          </div>

          {/* Lock icon */}
          <div className="fp-lock-icon">
            <svg width="24" height="24" fill="none" stroke="#128C7E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              <circle cx="12" cy="16" r="1" fill="#128C7E" stroke="none"/>
            </svg>
          </div>

          <h1 className="fb-heading">Esqueceu sua senha?</h1>
          <p className="fp-sub">
            Insira seu email e enviaremos um link para redefinir sua senha.
          </p>

          <div className="fp-divider" />

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="fp-email" className="fp-label">Email</label>
            <div className="fp-input-wrap">
              <svg className="fp-input-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                id="fp-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="fp-input"
              />
            </div>

            <button type="submit" disabled={loading} className="fp-btn">
              {loading ? (
                <><div className="fp-spinner" />Enviando…</>
              ) : (
                <>
                  Enviar link de redefinição
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>

            {message && (
              <div className="fp-alert fp-alert-success">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:'1px'}}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {message}
              </div>
            )}
            {error && (
              <div className="fp-alert fp-alert-error">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:'1px'}}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
          </form>

          <Link href="/views/auth/login" className="fp-back">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Voltar para o login
          </Link>

        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;