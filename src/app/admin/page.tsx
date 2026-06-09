'use client';

import { useState, useEffect } from 'react';
import { Users, ChefHat, Refrigerator, ShoppingCart, TrendingUp } from 'lucide-react';

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
        <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { icon: Users, label: 'Utilisateurs', value: stats.totalUsers, color: 'text-blue-400' },
    { icon: ChefHat, label: 'Recettes', value: stats.totalRecipes, color: 'text-fresh-400' },
    { icon: Refrigerator, label: 'Items frigo', value: stats.totalFridgeItems, color: 'text-yellow-400' },
    { icon: ShoppingCart, label: 'Listes courses', value: stats.totalShoppingLists, color: 'text-purple-400' },
  ];

  return (
    <div className="fade-in">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-fresh-500" />
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card p-5">
            <Icon className={`w-6 h-6 ${color} mb-2`} />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h2 className="font-semibold mb-4">Derniers inscrits</h2>
        <div className="space-y-3">
          {stats.recentUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-dark-600/30 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-fresh-500/20 rounded-full flex items-center justify-center text-sm font-bold text-fresh-500">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(u.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
