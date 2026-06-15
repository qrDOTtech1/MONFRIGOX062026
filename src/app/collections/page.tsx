'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useT } from '@/lib/i18n';
import { FolderHeart, Plus, ChevronRight, X, Loader2, ArrowLeft } from 'lucide-react';

interface Collection { id: string; name: string; emoji: string; count: number; }

const EMOJIS = ['📁', '⭐', '🍝', '🍰', '🥗', '🍲', '👨‍👩‍👧', '⚡', '🌱', '🎉', '🥘', '🍱'];

export default function CollectionsPage() {
  const router = useRouter();
  const { t } = useT();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/collections');
    if (res.ok) setCollections(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/collections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, emoji }),
    });
    if (res.ok) {
      setName(''); setEmoji('📁'); setCreating(false);
      load();
    }
    setSaving(false);
  }

  return (
    <AppShell>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> {t('collections.back')}
      </button>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <FolderHeart className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          <h1 className="text-lg font-semibold">{t('collections.myCollections')}</h1>
        </div>
        <button onClick={() => setCreating(c => !c)} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {creating && (
        <div className="card p-4 mb-4 fade-in">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('collections.namePlaceholder')} className="input-field mb-3" autoFocus />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} className="w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all"
                style={emoji === e ? { backgroundColor: 'var(--accent)' } : { backgroundColor: 'var(--bg-inset)' }}>
                {e}
              </button>
            ))}
          </div>
          <button onClick={create} disabled={!name.trim() || saving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('collections.createBtn')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16">
          <FolderHeart className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium mb-1">{t('collections.empty')}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('collections.emptySub')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {collections.map(c => (
            <button key={c.id} onClick={() => router.push(`/collections/${c.id}`)}
              className="card p-4 w-full flex items-center gap-3 hover:shadow-sm transition-all text-left">
              <span className="text-2xl">{c.emoji}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.count !== 1 ? t('collections.recipeCountPlural', { n: c.count }) : t('collections.recipeCount', { n: c.count })}</p>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
