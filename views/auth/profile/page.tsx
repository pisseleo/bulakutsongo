'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Camera, User, Mail, Shield, ShieldCheck, ShieldOff,
  Copy, Check, LogOut, Trash2, Key, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/Auth.context';
import { Input, Button, FormField, OtpInput } from '@components/ui/Input';
import { uploadFile } from '@/services/chat.service';
import apiClient from '@/services/apiClient';
import clsx from 'clsx';

type Tab = 'profile' | 'security';

export default function UserProfilePage() {
  const { user} = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-black" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="font-bold tracking-tight">{user?.full_name}</span>
        <span className="text-zinc-700 ml-1">/</span>
        <span className="text-zinc-400 text-sm">Perfil</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Avatar section */}
        <AvatarSection />

        {/* Tabs */}
        <div className="flex gap-1 mt-8 mb-6 bg-zinc-950 border border-zinc-900 rounded-xl p-1">
          {(['profile', 'security'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize',
                tab === t
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}

// ─── Avatar Section ───────────────────────────────────────────────────────────

function AvatarSection() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      await apiClient.put('/users/me', { profile_picture_url: result.url });
      updateUser({ profile_picture_url: result.url });
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
          {user?.profile_picture_url
            ? <Image src={user.profile_picture_url} alt={user.full_name} width={80} height={80} className="object-cover w-full h-full" />
            : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-600">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
          }
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 flex items-center justify-center transition-colors shadow-lg">
          <Camera size={13} className="text-black" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>
      <div>
        <h1 className="text-xl font-bold">{user?.full_name}</h1>
        <p className="text-sm text-zinc-500">@{user?.email}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {user?.is_verified
            ? <span className="flex items-center gap-1 text-xs text-green-400"><ShieldCheck size={12} />Verificado</span>
            : <span className="flex items-center gap-1 text-xs text-amber-500"><Shield size={12} />Nao Verificado</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.full_name || '',
    username: user?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.put('/users/me', form);
      updateUser(data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5">
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col gap-5">
        <FormField label="Display Name">
          <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            icon={<User size={15} />} />
        </FormField>
        <FormField label="Username">
          <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            icon={<span className="text-zinc-500 text-sm">@</span>} />
        </FormField>
        <FormField label="Email">
          <Input type="email" value={user?.email || ''} disabled
            icon={<Mail size={15} />}
            className="opacity-50 cursor-not-allowed" />
        </FormField>
        {/* <FormField label="Bio" hint="Tell others a little about yourself">
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={3}
            maxLength={200}
            placeholder="Optional bio..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none resize-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </FormField> */}
      </div>

      <Button type="submit" isLoading={saving} className={saved ? 'bg-green-500 hover:bg-green-500' : ''}>
        {saved ? <><Check size={15} />Saved</> : 'Save Changes'}
      </Button>
    </form>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const { user, getTotpSetup, confirmTotp, removeTotp, logout, logoutAll } = useAuth();

  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCode: string; backupCodes: string[] } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleSetupTotp = async () => {
    setTotpLoading(true);
    try {
      const setup = await getTotpSetup();
      setTotpSetup(setup);
    } catch {} finally { setTotpLoading(false); }
  };

  const handleConfirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    setTotpLoading(true);
    try {
      const result = await confirmTotp({ totpCode });
      setBackupCodes(result.backupCodes);
      setTotpSetup(null);
    } catch (err: any) {
      setTotpError(err?.response?.data?.error || 'Invalid code');
    } finally { setTotpLoading(false); }
  };

  const handleRemoveTotp = async () => {
    setTotpLoading(true);
    try {
      await removeTotp();
      setShowRemoveConfirm(false);
    } catch {} finally { setTotpLoading(false); }
  };

  const copyCode = (code: string, i: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 2FA Section */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center',
              user?.is_2fa_enabled ? 'bg-green-500/10' : 'bg-zinc-900')}>
              {user?.is_2fa_enabled
                ? <ShieldCheck size={20} className="text-green-400" />
                : <Shield size={20} className="text-zinc-500" />
              }
            </div>
            <div>
              <h3 className="text-sm font-semibold">Two-Factor Authentication</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {user?.is_2fa_enabled ? 'Active — your account is extra secure' : 'Add an extra layer of security'}
              </p>
            </div>
          </div>
          <div className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full',
            user?.is_2fa_enabled ? 'bg-green-500/10 text-green-400' : 'bg-zinc-900 text-zinc-500')}>
            {user?.is_2fa_enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {/* Backup codes after enabling */}
        {backupCodes.length > 0 && (
          <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-xs font-semibold text-amber-400 mb-3 uppercase tracking-wider">
              Save your backup codes
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {backupCodes.map((code, i) => (
                <button key={i} onClick={() => copyCode(code, i)}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 hover:bg-zinc-800 transition-colors">
                  {code}
                  {copiedIdx === i ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-zinc-600" />}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600">Store these safely. Each code can only be used once.</p>
          </div>
        )}

        {/* TOTP Setup flow */}
        {totpSetup && !user?.is_2fa_enabled && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="bg-zinc-900 rounded-xl p-4 flex flex-col items-center gap-3">
              <img src={totpSetup.qrCode} alt="TOTP QR Code" className="w-40 h-40 rounded-lg" />
              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-1">Or enter manually</p>
                <code className="text-xs bg-zinc-800 px-3 py-1.5 rounded-lg text-amber-400 font-mono">
                  {totpSetup.secret}
                </code>
              </div>
            </div>
            <form onSubmit={handleConfirmTotp} className="flex flex-col gap-3">
              <p className="text-xs text-zinc-400 text-center">Enter the 6-digit code from your authenticator app</p>
              <OtpInput length={6} value={totpCode} onChange={setTotpCode} error={totpError} />
              <Button type="submit" isLoading={totpLoading} fullWidth disabled={totpCode.length < 6}>
                Enable 2FA
              </Button>
            </form>
          </div>
        )}

        {/* Actions */}
        {!totpSetup && (
          <div className="mt-4">
            {!user?.is_2fa_enabled ? (
              <Button onClick={handleSetupTotp} isLoading={totpLoading} variant="ghost" fullWidth>
                <Key size={15} />
                Set up authenticator app
                <ChevronRight size={15} className="ml-auto" />
              </Button>
            ) : (
              <>
                {!showRemoveConfirm ? (
                  <Button onClick={() => setShowRemoveConfirm(true)} variant="danger" fullWidth>
                    <ShieldOff size={15} />
                    Disable 2FA
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-zinc-400 text-center">Are you sure? This will remove 2FA from your account.</p>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowRemoveConfirm(false)} variant="ghost" fullWidth>Cancel</Button>
                      <Button onClick={handleRemoveTotp} isLoading={totpLoading} variant="danger" fullWidth>
                        Yes, disable
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Session management */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Sessions</h3>
        <Button onClick={() => logout()} variant="ghost" fullWidth>
          <LogOut size={15} />
          Sign out of this device
        </Button>
        <Button onClick={() => logoutAll()} variant="danger" fullWidth>
          <Trash2 size={15} />
          Sign out of all devices
        </Button>
      </div>
    </div>
  );
}