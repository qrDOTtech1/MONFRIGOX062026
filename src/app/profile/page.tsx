'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { UserCircle, LogOut, Shield, ChefHat, Heart, ShoppingCart, Refrigerator } from 'lucide-react';

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
      <div className="flex items-center gap-3 mb-6">
        <UserCircle className="w-6 h-6 text-fresh-500" />
        <h1 className="text-xl font-bold">Mon profil</h1>
      </div>

      {user && (
        <>
          <div className="glass-card p-6 text-center mb-6">
            <div className="w-20 h-20 bg-fresh-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl font-bold text-fresh-500">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-lg font-bold">{user.name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
            {user.role === 'ADMIN' && (
              <span className="inline-flex items-center gap-1 mt-2 badge bg-fresh-500/20 text-fresh-400">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            <p className="text-gray-600 text-xs mt-2">
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card p-4 text-center">
              <Refrigerator className="w-5 h-5 text-fresh-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.fridgeCount}</p>
              <p className="text-[10px] text-gray-500">Ingrédients</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.favCount}</p>
              <p className="text-[10px] text-gray-500">Favoris</p>
            </div>
            <div className="glass-card p-4 text-center">
              <ShoppingCart className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.listCount}</p>
              <p className="text-[10px] text-gray-500">Listes</p>
            </div>
          </div>

          {user.role === 'ADMIN' && (
            <button onClick={() => router.push('/admin')} className="btn-secondary w-full mb-3 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" /> Portail Admin
            </button>
          )}

          <button onClick={logout} className="btn-secondary w-full mb-3 flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>

          <button onClick={deleteAccount} className="w-full py-3 text-sm text-red-400 hover:text-red-300 transition-colors">
            Supprimer mon compte
          </button>
        </>
      )}
    </AppShell>
  );
}
