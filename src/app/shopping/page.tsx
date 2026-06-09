'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { ShoppingCart, Check, Trash2, Plus } from 'lucide-react';

interface ShoppingItem {
  id: string;
  quantity: number;
  unit: string;
  checked: boolean;
  ingredient: { name: string; emoji: string };
}

interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  items: ShoppingItem[];
}

export default function ShoppingPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/shopping');
    if (res.ok) setLists(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleItem(listId: string, itemId: string, checked: boolean) {
    await fetch(`/api/shopping/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, checked: !checked }),
    });
    load();
  }

  async function deleteList(listId: string) {
    await fetch(`/api/shopping/${listId}`, { method: 'DELETE' });
    load();
  }

  async function addCheckedToFridge(list: ShoppingList) {
    const checked = list.items.filter(i => i.checked);
    for (const item of checked) {
      await fetch('/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId: item.ingredient ? undefined : undefined }),
      });
    }
    await deleteList(list.id);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-2.5 mb-6">
        <ShoppingCart className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-lg font-semibold">Listes de courses</h1>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune liste de courses</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Génère-en une depuis une recette</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const done = list.items.filter(i => i.checked).length;
            const total = list.items.length;
            return (
              <div key={list.id} className="card p-4 fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-sm">{list.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{done}/{total} acheté{done > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-1">
                    {done > 0 && (
                      <button onClick={() => addCheckedToFridge(list)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]" title="Ajouter au frigo">
                        <Plus className="w-4 h-4 text-emerald-500" />
                      </button>
                    )}
                    <button onClick={() => deleteList(list.id)} className="p-2 rounded-md transition-colors hover:bg-[var(--bg-inset)]">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {list.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(list.id, item.id, item.checked)}
                      className="w-full flex items-center gap-2.5 py-2 px-2 rounded-md transition-colors text-left hover:bg-[var(--bg-inset)]"
                    >
                      <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${
                        item.checked ? 'bg-[var(--accent)] border-[var(--accent)]' : ''
                      }`} style={!item.checked ? { borderColor: 'var(--border)' } : undefined}>
                        {item.checked && <Check className="w-3 h-3" style={{ color: 'var(--accent-text)' }} />}
                      </div>
                      <span className="text-sm">{item.ingredient.emoji}</span>
                      <span className={`text-sm flex-1 ${item.checked ? 'line-through' : ''}`} style={{ color: item.checked ? 'var(--text-muted)' : 'var(--text)' }}>
                        {item.ingredient.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.quantity} {item.unit}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
