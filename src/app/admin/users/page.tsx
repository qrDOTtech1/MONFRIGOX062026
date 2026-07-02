'use client';
import MascotLoader from '@/components/MascotLoader';

import { useState, useEffect, useCallback } from 'react';
import { Users, Trash2, Shield, ShieldOff, Search, RotateCcw, Gift } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  plan: string;
  planExpiresAt: string | null;
  extraQuota: number;
  aiCallsMonth: number;
  _count: { fridgeItems: number; favorites: number };
}

const PLAN_COLORS: Record<string, { bg: string; fg: string }> = {
  FREE: { bg: 'var(--bg-inset)', fg: 'var(--text-secondary)' },
  PREMIUM: { bg: 'rgba(59,130,246,0.1)', fg: '#3b82f6' },
  VIP: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
};

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

  async function changePlan(id: string, plan: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    load();
  }

  async function resetQuota(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetQuota: true }),
    });
    load();
  }

  async function grantExtraQuota(id: string, current: number) {
    const amount = prompt('Combien de requêtes IA bonus offrir ?', '10');
    if (!amount) return;
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraQuota: current + (parseInt(amount) || 0) }),
    });
    load();
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <MascotLoader />;

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-xl font-semibold">Utilisateurs ({users.length})</h1>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field !pl-10"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Utilisateur</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Rôle</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Plan</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Quota IA</th>
                <th className="text-left text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Inscrit</th>
                <th className="text-right text-xs font-medium px-4 py-3" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="transition-colors hover:bg-[var(--bg-inset)]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      onChange={e => changePlan(u.id, e.target.value)}
                      className="text-xs font-medium rounded-md px-2 py-1 border-0 cursor-pointer"
                      style={{ backgroundColor: PLAN_COLORS[u.plan]?.bg, color: PLAN_COLORS[u.plan]?.fg }}
                    >
                      <option value="FREE">FREE</option>
                      <option value="PREMIUM">PREMIUM</option>
                      <option value="VIP">VIP</option>
                    </select>
                    {u.planExpiresAt && u.plan !== 'FREE' && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        jusqu&apos;au {new Date(u.planExpiresAt).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <p>{u.aiCallsMonth} appel{u.aiCallsMonth > 1 ? 's' : ''} {u.plan === 'FREE' ? '(à vie)' : '(mois)'}</p>
                    {u.extraQuota > 0 && <p className="text-emerald-500">+{u.extraQuota} bonus</p>}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5 justify-end">
                      <button onClick={() => grantExtraQuota(u.id, u.extraQuota)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]" title="Offrir des requêtes IA bonus">
                        <Gift className="w-4 h-4 text-emerald-500" />
                      </button>
                      <button onClick={() => resetQuota(u.id)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]" title="Réinitialiser le quota IA">
                        <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button onClick={() => toggleRole(u.id, u.role)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]" title="Changer le rôle">
                        {u.role === 'ADMIN' ? <ShieldOff className="w-4 h-4 text-amber-500" /> : <Shield className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]" title="Supprimer">
                        <Trash2 className="w-4 h-4 text-red-400" />
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
