'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Trash2, RefreshCw, Megaphone, Image, MessageSquare, ChevronLeft, ChevronRight, Send, X } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  photoUrl: string;
  isPublic: boolean;
  likeCount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  recipe: { id: string; name: string };
}

export default function ModerationPage() {
  const [notes, setNotes]         = useState<Note[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [filter, setFilter]       = useState<'all' | 'public' | 'hidden'>('all');
  const [loading, setLoading]     = useState(false);
  const [actionId, setActionId]   = useState<string | null>(null);

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bTitle, setBTitle] = useState('');
  const [bBody, setBBody]   = useState('');
  const [bUrl, setBUrl]     = useState('');
  const [bSending, setBSending] = useState(false);
  const [bResult, setBResult]   = useState<{ sent: number; failed: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?filter=${filter}&page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
        setTotal(data.total);
        setPages(data.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  async function toggle(id: string, current: boolean) {
    setActionId(id);
    await fetch('/api/admin/moderation', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isPublic: !current }),
    });
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPublic: !current } : n));
    setActionId(null);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement ce contenu ?')) return;
    setActionId(id);
    await fetch('/api/admin/moderation', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotes(prev => prev.filter(n => n.id !== id));
    setTotal(t => t - 1);
    setActionId(null);
  }

  async function sendBroadcast() {
    if (!bTitle.trim() || !bBody.trim()) return;
    setBSending(true);
    setBResult(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bTitle, body: bBody, url: bUrl || '/' }),
      });
      if (res.ok) {
        const data = await res.json();
        setBResult(data);
        setBTitle(''); setBBody(''); setBUrl('');
      }
    } finally {
      setBSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Modération</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Contenu communauté · {total} post{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBroadcast(!showBroadcast)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text)' }}>
            <Megaphone className="w-4 h-4" />
            Broadcast
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Broadcast panel */}
      {showBroadcast && (
        <div className="card p-4 space-y-3 border-l-4 fade-in" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              Notification broadcast (tous les abonnés)
            </h2>
            <button onClick={() => setShowBroadcast(false)}>
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <input value={bTitle} onChange={e => setBTitle(e.target.value)}
            placeholder="Titre *"
            className="input-field text-sm" />
          <textarea value={bBody} onChange={e => setBBody(e.target.value)}
            placeholder="Message *"
            rows={2}
            className="input-field text-sm resize-none" />
          <input value={bUrl} onChange={e => setBUrl(e.target.value)}
            placeholder="URL de destination (ex: /dashboard)"
            className="input-field text-sm" />
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Sera envoyée à tous les utilisateurs ayant activé les notifications push.
            </p>
            <button onClick={sendBroadcast}
              disabled={bSending || !bTitle.trim() || !bBody.trim()}
              className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
              <Send className="w-3.5 h-3.5" />
              {bSending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
          {bResult && (
            <p className="text-sm font-medium text-emerald-500">
              ✓ Envoyé à {bResult.sent} appareil{bResult.sent !== 1 ? 's' : ''}
              {bResult.failed > 0 && ` (${bResult.failed} échec${bResult.failed !== 1 ? 's' : ''})`}
            </p>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2">
        {(['all', 'public', 'hidden'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filter === f
              ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
              : { backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            {f === 'all' ? 'Tous' : f === 'public' ? 'Publics' : 'Masqués'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>Chargement…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 card p-8">
          <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Aucun contenu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className={`card p-4 ${actionId === note.id ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold">{note.user.name || note.user.email}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                    <a href={`/recipes/${note.recipe.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>
                      {note.recipe.name}
                    </a>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${note.isPublic ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                      {note.isPublic ? 'Public' : 'Masqué'}
                    </span>
                    {note.likeCount > 0 && (
                      <span className="text-xs text-red-500">❤️ {note.likeCount}</span>
                    )}
                  </div>

                  {/* Contenu */}
                  {note.content && (
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {note.content}
                    </p>
                  )}

                  {/* Photo */}
                  {note.photoUrl && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                      <img src={note.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      <a href={note.photoUrl} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <Image className="w-4 h-4 text-white" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => toggle(note.id, note.isPublic)}
                    disabled={actionId === note.id}
                    title={note.isPublic ? 'Masquer' : 'Rendre public'}
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--bg-inset)' }}>
                    {note.isPublic
                      ? <EyeOff className="w-4 h-4 text-amber-500" />
                      : <Eye className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button onClick={() => remove(note.id)}
                    disabled={actionId === note.id}
                    title="Supprimer définitivement"
                    className="p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-inset)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Page {page} / {pages}
          </span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--bg-inset)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
