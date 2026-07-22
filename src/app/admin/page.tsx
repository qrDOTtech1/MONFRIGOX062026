'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ChefHat, Refrigerator, ShoppingCart, BarChart3, TrendingUp } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalRecipes: number;
  totalFridgeItems: number;
  totalShoppingLists: number;
  recentUsers: Array<{ id: string; name: string; email: string; createdAt: string }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.ok ? r.json() : null).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const cards = [
    { icon: Users, label: 'Utilisateurs', value: stats.totalUsers },
    { icon: ChefHat, label: 'Recettes', value: stats.totalRecipes },
    { icon: Refrigerator, label: 'Items frigo', value: stats.totalFridgeItems },
    { icon: ShoppingCart, label: 'Listes courses', value: stats.totalShoppingLists },
  ];

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4">
            <Icon className="w-5 h-5 mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      <Link href="/admin/analytics"
        className="flex items-center gap-3 card p-4 mb-3 hover:opacity-80 transition-opacity">
        <TrendingUp className="w-5 h-5" style={{ color: 'rgb(16,185,129)' }} />
        <div>
          <p className="font-medium text-sm">Analytics visiteurs</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trafic, invités, conversions, funnel</p>
        </div>
      </Link>

      <div className="card p-4">
        <h2 className="font-medium text-sm mb-4">Derniers inscrits</h2>
        <div className="space-y-2">
          {stats.recentUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date(u.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
