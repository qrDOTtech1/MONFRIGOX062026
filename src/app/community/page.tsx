'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { Heart, Clock, TrendingUp, ChefHat, MessageSquare, Crown, Loader2, Plus } from 'lucide-react';

interface CommunityNote {
  id: string;
  content: string;
  photoUrl: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  author: string;
  recipe: { id: string; name: string; imageUrl: string };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function NoteCard({ note, onLike }: { note: CommunityNote; onLike: (id: string) => void }) {
  return (
    <div className="card overflow-hidden">
      {/* Photo */}
      {note.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={note.photoUrl} alt="" className="w-full h-52 object-cover" />
      )}

      <div className="p-4">
        {/* Recette liée */}
        <Link href={`/recipes/${note.recipe.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-2 px-2 py-1 rounded-full transition-opacity hover:opacity-70"
          style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
          <ChefHat className="w-3 h-3" />
          {note.recipe.name}
        </Link>

        {/* Contenu */}
        {note.content && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            {note.content}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>
              {note.author.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium">{note.author}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo(note.createdAt)}</span>
          </div>

          <button
            onClick={() => onLike(note.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-90"
            style={{
              backgroundColor: note.likedByMe ? 'rgba(239,68,68,0.1)' : 'var(--bg-inset)',
              border: `1px solid ${note.likedByMe ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
            }}
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${note.likedByMe ? 'fill-red-500 text-red-500' : ''}`}
              style={{ color: note.likedByMe ? undefined : 'var(--text-muted)' }} />
            <span className="text-xs font-semibold" style={{ color: note.likedByMe ? 'rgb(239,68,68)' : 'var(--text-muted)' }}>
              {note.likeCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const [sort, setSort]   = useState<'latest' | 'top'>('latest');
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (s: 'latest' | 'top', p: number, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    const res = await fetch(`/api/community?sort=${s}&page=${p}`);
    if (res.ok) {
      const data = await res.json();
      setNotes(prev => append ? [...prev, ...data.notes] : data.notes);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    }
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { load(sort, 1); }, [sort, load]);

  async function handleLike(noteId: string) {
    const res = await fetch(`/api/notes/${noteId}/like`, { method: 'POST' });
    if (!res.ok) return;
    const { liked } = await res.json();
    setNotes(prev => prev.map(n =>
      n.id !== noteId ? n : {
        ...n,
        likedByMe: liked,
        likeCount: liked ? n.likeCount + 1 : n.likeCount - 1,
      }
    ));
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-lg font-semibold">Communauté</h1>
          {total > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-muted)' }}>
              {total} post{total > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Partager sa recette */}
      <Link href="/recipes/new"
        className="card p-3.5 mb-5 flex items-center gap-3 hover:shadow-sm transition-all"
        style={{ border: '1px solid var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)' }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Plus className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">Partager ma recette</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Publie ta création — elle apparaîtra dans Explorer (filtre Communauté)</p>
        </div>
        <ChefHat className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </Link>

      {/* Tri */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: 'var(--bg-inset)' }}>
        <button
          onClick={() => { setSort('latest'); setPage(1); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: sort === 'latest' ? 'var(--bg-raised)' : 'transparent',
            color: sort === 'latest' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: sort === 'latest' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Clock className="w-3.5 h-3.5" /> Derniers
        </button>
        <button
          onClick={() => { setSort('top'); setPage(1); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: sort === 'top' ? 'var(--bg-raised)' : 'transparent',
            color: sort === 'top' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: sort === 'top' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Top ❤️
        </button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2.5">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement…</span>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 px-6">
          <div className="text-5xl mb-4">🍽️</div>
          <h2 className="font-semibold mb-2">Personne n&apos;a encore posté</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Sois le premier ! Va sur une recette, ajoute une note publique avec ta photo.
          </p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            <ChefHat className="w-4 h-4" /> Voir les recettes
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {notes.map(note => (
              <NoteCard key={note.id} note={note} onLike={handleLike} />
            ))}
          </div>

          {page < pages && (
            <button
              onClick={() => load(sort, page + 1, true)}
              disabled={loadingMore}
              className="btn-secondary w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loadingMore
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                : 'Voir plus'
              }
            </button>
          )}

          {page >= pages && notes.length > 0 && (
            <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
              — {total} post{total > 1 ? 's' : ''} au total —
            </p>
          )}
        </>
      )}

      {/* Promo note */}
      <div className="mt-8 rounded-2xl p-4 text-center"
        style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
        <Crown className="w-5 h-5 mx-auto mb-2 text-amber-500" />
        <p className="text-sm font-medium mb-1">Notes communautaires</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Partage tes photos et astuces sur chaque recette.<br />
          Disponible dès le plan Premium.
        </p>
        <Link href="/profile" className="btn-primary inline-flex items-center gap-2 mt-3 text-sm">
          Débloquer Premium
        </Link>
      </div>
    </AppShell>
  );
}
