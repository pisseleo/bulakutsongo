import React, { forwardRef, type InputHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, rightIcon, ...props }, ref) => (
    <div className="relative w-full">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full bg-zinc-900 border rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all duration-200',
          'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
          icon && 'pl-10',
          rightIcon && 'pr-10',
          error ? 'border-red-500/70' : 'border-zinc-800',
          className
        )}
        {...props}
      />
      {rightIcon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
          {rightIcon}
        </span>
      )}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', isLoading, fullWidth, className, disabled, ...props
}) => {
  const base = 'relative flex items-center justify-center gap-2 rounded-xl font-medium text-sm px-5 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'bg-transparent border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white hover:bg-zinc-900',
    danger: 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(base, variants[variant], fullWidth && 'w-full', className)}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : children}
    </button>
  );
};

// ─── FormField ────────────────────────────────────────────────────────────────

export const FormField: React.FC<{ label: string; error?: string; children: ReactNode; hint?: string }> = ({
  label, error, children, hint
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</label>
    {children}
    {hint && !error && <p className="text-xs text-zinc-600">{hint}</p>}
  </div>
);

// ─── AuthCard ─────────────────────────────────────────────────────────────────

export const AuthCard: React.FC<{ children: ReactNode; title: string; subtitle?: string }> = ({
  children, title, subtitle
}) => (
  <div className="min-h-screen bg-black flex items-center justify-center p-4">
    {/* Ambient glow */}
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute top-[-20%] left-[60%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
    </div>

    <div className="relative w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-black" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Nexus</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1.5">{subtitle}</p>}
      </div>

      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 shadow-2xl">
        {children}
      </div>
    </div>
  </div>
);

// ─── OTP Input ────────────────────────────────────────────────────────────────

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({ length = 6, value, onChange, error }) => {
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits];
      next[i - 1] = '';
      onChange(next.join(''));
      (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = char;
    onChange(next.join(''));
    if (char && i < length - 1) {
      (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, '').slice(0, length));
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            onPaste={handlePaste}
            className={clsx(
              'w-11 h-13 text-center text-lg font-bold bg-zinc-900 border rounded-xl text-white outline-none transition-all',
              'focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
              error ? 'border-red-500/60' : d ? 'border-zinc-700' : 'border-zinc-800'
            )}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
};