'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/Auth.context';
import styles from './register.module.css';

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

interface FormErrors {
  full_name?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.full_name.trim()) e.full_name = 'Nome completo é obrigatório';
    if (!form.phone.trim()) e.phone = 'Telefone é obrigatório';
    else if (!/^[0-9]{9,12}$/.test(form.phone)) e.phone = '9-12 dígitos, apenas números';
    if (!form.email) e.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!PASSWORD_RE.test(form.password)) e.password = 'Mínimo 8 caracteres com maiúscula, minúscula e número';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'As senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');
    try {
      await register({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        password: form.password,
      });
      if (profileImage) {
        localStorage.setItem('tempUserAvatar', profileImage);
      }
      router.push('/views/auth/otp-verify?email=' + encodeURIComponent(form.email));
    } catch (err: unknown) {
      setApiError((err as ApiError)?.response?.data?.error || 'Falha no registo. Tente novamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        <div className={styles.box}>
          <div className={styles.logo}>📝</div>
          <h1 className={styles.title}>BulakutSongo</h1>
          <p className={styles.subtitle}>Criar nova conta</p>

          {apiError && <div className={styles.error}>{apiError}</div>}

          {/* Avatar Section */}
          <div className={styles.avatarSection}>
            <div 
              className={styles.avatarPreview} 
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {profileImage ? (
                <img src={profileImage} alt="Perfil" className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span>📷</span>
                  <span className={styles.avatarText}>Adicionar foto</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/png,image/jpg"
              style={{ display: 'none' }}
            />
            <p className={styles.avatarHint}>Clique na imagem para adicionar foto (opcional)</p>
          </div>

          {/* Nome completo */}
          <div className={styles.inputGroup}>
            <label>Nome completo <span className={styles.required}>*</span></label>
            <input 
              type="text" 
              placeholder="Seu nome"
              value={form.full_name}
              onChange={setField('full_name')}
            />
            {errors.full_name && <span className={styles.fieldError}>{errors.full_name}</span>}
          </div>

          {/* Telefone */}
          <div className={styles.inputGroup}>
            <label>Telefone <span className={styles.required}>*</span></label>
            <input 
              type="tel" 
              placeholder="84 123 4567"
              value={form.phone}
              onChange={setField('phone')}
            />
            {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
          </div>

          {/* Email */}
          <div className={styles.inputGroup}>
            <label>Email <span className={styles.required}>*</span></label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              value={form.email}
              onChange={setField('email')}
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          {/* Senha */}
          <div className={styles.inputGroup}>
            <label>Senha <span className={styles.required}>*</span></label>
            <div className={styles.passwordWrapper}>
              <input 
                type={showPass ? 'text' : 'password'} 
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={setField('password')}
              />
              <button 
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>

          {/* Confirmar senha */}
          <div className={styles.inputGroup}>
            <label>Confirmar senha <span className={styles.required}>*</span></label>
            <input 
              type="password" 
              placeholder="Repita a senha"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
            />
            {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
          </div>

          <button className={styles.button} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'A criar conta...' : 'Criar conta'}
          </button>

          <div className={styles.divider}></div>

          <div className={styles.links}>
            <a href="/views/auth/login">Já tem conta? Entrar</a>
          </div>
        </div>
      </div>
    </div>
  );
}