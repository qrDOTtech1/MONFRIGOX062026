'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import MascotLoader from '@/components/MascotLoader';
import { Home, Users, UserPlus, LogOut, Copy, Check, Trash2, Crown, Link as LinkIcon, Plus } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
}

interface Household {
  id: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  members: Member[];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/household');
    if (res.ok) setHousehold(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createHousehold() {
    if (!newName.trim()) return;
    setCreating(true); setError('');
    const res = await fetch('/api/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setCreating(false); return; }
    setShowCreate(false); setNewName('');
    load();
  }

  async function generateInvite() {
    setGeneratingInvite(true); setError('');
    const res = await fetch('/api/household/invite', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setGeneratingInvite(false); return; }
    setInviteUrl(data.url);
    setGeneratingInvite(false);
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function leaveHousehold() {
    if (!confirm('Êtes-vous sûr de vouloir quitter ce foyer ?')) return;
    setLeaving(true);
    await fetch('/api/household', { method: 'DELETE' });
    setHousehold(null);
    setInviteUrl('');
    setLeaving(false);
  }

  async function removeMember(memberId: string) {
    setRemovingId(memberId);
    await fetch(`/api/household/members/${memberId}`, { method: 'DELETE' });
    setRemovingId(null);
    load();
  }

  if (loading) return <AppShell><MascotLoader /></AppShell>;

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-5">
        <Home className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <div>
          <h2 className="font-semibold text-base">Mon Foyer</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Frigo partagé entre membres du foyer</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 mb-4 text-sm text-red-600" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {household === null && !showCreate && (
        <div className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
            <Home className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm font-medium mb-1">Vous n&apos;avez pas encore de foyer</p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Créez un foyer pour partager votre frigo avec votre famille ou vos colocataires.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            <Plus className="w-4 h-4" /> Créer un foyer
          </button>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Ou rejoignez un foyer existant via un lien d&apos;invitation.
          </p>
        </div>
      )}

      {showCreate && (
        <div className="card p-4 mb-4 fade-in">
          <p className="text-sm font-semibold mb-3">Nom du foyer</p>
          <input
            type="text"
            placeholder="ex : Famille Martin, Appart 3B…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createHousehold()}
            className="input-field mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button onClick={createHousehold} disabled={creating || !newName.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              {creating ? 'Création…' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {household && (
        <>
          {/* Header foyer */}
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>
                🏠
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{household.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {household.members.length} membre{household.members.length > 1 ? 's' : ''}
                  {household.role === 'ADMIN' && <span className="ml-2 text-emerald-600 font-semibold">· Admin</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Liste des membres */}
          <div className="card mb-4">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <span className="text-sm font-semibold">Membres</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {household.members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                  </div>
                  {m.role === 'ADMIN' && (
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  {household.role === 'ADMIN' && m.role !== 'ADMIN' && (
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={removingId === m.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Inviter */}
          {household.role === 'ADMIN' && (
            <div className="card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">Inviter quelqu&apos;un</span>
              </div>
              {!inviteUrl ? (
                <button
                  onClick={generateInvite}
                  disabled={generatingInvite}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', color: 'rgb(22,163,74)' }}>
                  <LinkIcon className="w-4 h-4" />
                  {generatingInvite ? 'Génération…' : 'Générer un lien d\'invitation'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                    <p className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{inviteUrl}</p>
                    <button onClick={copyInvite} className="shrink-0 transition-colors">
                      {copied
                        ? <Check className="w-4 h-4 text-emerald-500" />
                        : <Copy className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Valable 7 jours · Partagez ce lien avec la personne à inviter
                  </p>
                  <button onClick={generateInvite} disabled={generatingInvite}
                    className="text-xs underline" style={{ color: 'var(--text-muted)' }}>
                    Générer un nouveau lien
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quitter */}
          <button
            onClick={leaveHousehold}
            disabled={leaving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(220,38,38)' }}>
            <LogOut className="w-4 h-4" />
            {leaving ? 'Départ…' : 'Quitter le foyer'}
          </button>
        </>
      )}
    </AppShell>
  );
}
