'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: '#0d0d12',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* subtle grid texture */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 48px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 48px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '13px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
              marginBottom: '16px',
              fontWeight: 400,
            }}
          >
            Portal de Mensagens
          </div>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-1.5px',
              lineHeight: 1,
              margin: 0,
            }}
          >
            Bula
            <span style={{ color: '#e94560' }}>kutsongo</span>
          </h1>
          <div
            style={{
              width: '32px',
              height: '3px',
              background: '#e94560',
              borderRadius: '2px',
              margin: '14px auto 0',
            }}
          />
        </div>

        {/* Card */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '40px 36px 32px',
          }}
        >
          {/* Welcome text */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 600,
                color: '#fff',
                margin: '0 0 10px',
                letterSpacing: '-0.5px',
              }}
            >
              Bem-vindo ao portal
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Portal de mensagens instantâneas para manter você conectado com quem importa.
            </p>
          </div>

          {/* Online badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(34,197,94,0.08)',
              border: '0.5px solid rgba(34,197,94,0.2)',
              borderRadius: '30px',
              padding: '8px 20px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#22c55e',
                flexShrink: 0,
                boxShadow: '0 0 6px #22c55e',
              }}
            />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                2.400+ usuários
              </strong>{' '}
              online agora
            </span>
          </div>

          {/* Primary CTA — Register */}
          <button
            onClick={() => router.push('/views/auth/register')}
            style={{
              width: '100%',
              padding: '14px',
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              marginBottom: '10px',
              letterSpacing: '-0.2px',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => ((e.target as HTMLButtonElement).style.background = '#c73652')}
            onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = '#e94560')}
            onMouseDown={e => ((e.target as HTMLButtonElement).style.transform = 'scale(0.98)')}
            onMouseUp={e => ((e.target as HTMLButtonElement).style.transform = 'scale(1)')}
          >
            Criar conta gratuita
          </button>

          {/* Secondary CTA — Login */}
          <button
            onClick={() => router.push('/views/auth/login')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.75)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)';
              (e.target as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
              (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
            }}
          >
            Já tenho uma conta
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '24px 0 20px',
            }}
          >
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              ou entre com
            </span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* OAuth */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { label: 'Google', icon: '🇬' },
              { label: 'GitHub', icon: '⌥' },
            ].map(({ label }) => (
              <button
                key={label}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                  (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.85)';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: '24px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Ao continuar, você concorda com os{' '}
          <span style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>Termos de Uso</span>{' '}
          e{' '}
          <span style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            Política de Privacidade
          </span>
          .<br />© 2026 Bulakutsongo. Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
}