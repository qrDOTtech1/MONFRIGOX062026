'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useTheme } from '@/components/ThemeProvider';
import { UserCircle, LogOut, Shield, Heart, ShoppingCart, Refrigerator, Sun, Moon } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Stats {
  fridgeCount: number;
  favCount: number;
  listCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ fridgeCount: 0, favCount: 0, listCount: 0 });

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => d && setUser(d.user));
    fetch('/api/profile/stats').then(r => r.ok ? r.json() : null).then(d => d && setStats(d));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  async function deleteAccount() {
    if (!confirm('Supprimer ton compte? Cette action est irréversible.')) return;
    const res = await fetch('/api/profile', { method: 'DELETE' });
    if (res.ok) { await logout(); }
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <UserCircle className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Mon profil</h1>
      </div>

      {user && (
        <>
          <div className="card p-5 text-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--bg-inset)' }}>
              <span className="text-2xl font-semibold" style={{ color: 'var(--text-secondary)' }}>{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-base font-semibold">{user.name}</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
            {user.role === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 mt-2 badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="card p-3.5 text-center">
              <Refrigerator className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
              <p className="text-base font-semibold">{stats.fridgeCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ingrédients</p>
            </div>
            <div className="card p-3.5 text-center">
              <Heart className="w-4 h-4 mx-auto mb-1 text-red-400" />
              <p className="text-base font-semibold">{stats.favCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Favoris</p>
            </div>
            <div className="card p-3.5 text-center">
              <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-amber-400" />
              <p className="text-base font-semibold">{stats.listCount}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Listes</p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={toggle}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            </button>

            {user.role === 'ADMIN' && (
              <button onClick={() => router.push('/admin')} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> Portail Admin
              </button>
            )}

            <button onClick={logout} className="btn-secondary w-full flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>

            <button onClick={deleteAccount} className="w-full py-3 text-sm text-red-500 hover:text-red-400 transition-colors">
              Supprimer mon compte
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
