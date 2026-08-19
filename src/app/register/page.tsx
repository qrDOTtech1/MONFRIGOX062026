'use client';

import { migrateGuestFridge } from '@/lib/guestFridge';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { trackSignup } from '@/lib/track';

export default function RegisterPage() {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      // Signale la conversion aux pixels (Meta/TikTok/GA) → optimisation des pubs.
      trackSignup();
      // Le frigo constitué en visiteur est versé dans le nouveau compte : c'est
      // la promesse faite sur la bannière, elle doit être tenue.
      await migrateGuestFridge();
      // Onboarding lancé automatiquement juste après la création du compte
      router.push('/onboarding');
    } catch {
      setError(t('register.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <p className="text-2xl font-bold tracking-tight mb-4">Mon Frigo</p>
          <h1 className="text-xl font-semibold">{t('register.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('register.sub')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="rounded-lg px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder={t('register.name')} value={name} onChange={e => setName(e.target.value)} className="input-field !pl-10" required />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input type="email" placeholder={t('register.email')} value={email} onChange={e => setEmail(e.target.value)} className="input-field !pl-10" required />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder={t('register.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field !pl-10 !pr-10"
              minLength={6}
              required
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t('register.loading') : t('register.submit')}
          </button>
        </form>

        {/* Message rassurant confidentialité */}
        <div className="mt-5 rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'rgb(16,185,129)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('register.privacy')}{' '}
            <Link href="/privacy" className="underline font-medium" style={{ color: 'rgb(16,185,129)' }}>
              {t('register.privacyLink')}
            </Link>
          </p>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          {t('register.hasAccount')}{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--text)' }}>{t('register.login')}</Link>
        </p>
      </div>
    </div>
  );
}
