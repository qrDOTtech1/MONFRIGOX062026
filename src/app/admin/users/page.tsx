'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, Shield, ShieldOff, Search } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { fridgeItems: number; favorites: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteUser(id: string) {
    if (!confirm('Supprimer cet utilisateur?')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleRole(id: string, currentRole: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: currentRole === 'ADMIN' ? 'USER' : 'ADMIN' }),
    });
    load();
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-fresh-500" />
          <h1 className="text-2xl font-bold">Utilisateurs ({users.length})</h1>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field !pl-11"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600/50">
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Utilisateur</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Rôle</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Frigo</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Favoris</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Inscrit</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-dark-600/20 hover:bg-dark-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-fresh-500/20 rounded-full flex items-center justify-center text-xs font-bold text-fresh-500">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.role === 'ADMIN' ? 'bg-fresh-500/20 text-fresh-400' : 'bg-dark-600 text-gray-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u._count.fridgeItems}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u._count.favorites}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => toggleRole(u.id, u.role)} className="p-2 hover:bg-dark-600 rounded-lg transition-colors" title="Changer le rôle">
                        {u.role === 'ADMIN' ? <ShieldOff className="w-4 h-4 text-yellow-400" /> : <Shield className="w-4 h-4 text-gray-500" />}
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
