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
          <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-6 h-6 text-fresh-500" />
        <h1 className="text-xl font-bold">Listes de courses</h1>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500">Aucune liste de courses</p>
          <p className="text-gray-600 text-xs mt-1">Génère-en une depuis une recette!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => {
            const done = list.items.filter(i => i.checked).length;
            const total = list.items.length;
            return (
              <div key={list.id} className="glass-card p-4 fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{list.name}</h3>
                    <p className="text-xs text-gray-500">{done}/{total} acheté{done > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    {done > 0 && (
                      <button onClick={() => addCheckedToFridge(list)} className="p-2 hover:bg-fresh-500/20 rounded-lg transition-colors" title="Ajouter au frigo">
                        <Plus className="w-4 h-4 text-fresh-500" />
                      </button>
                    )}
                    <button onClick={() => deleteList(list.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {list.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(list.id, item.id, item.checked)}
                      className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-dark-600/50 transition-colors text-left"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.checked ? 'bg-fresh-500 border-fresh-500' : 'border-gray-600'
                      }`}>
                        {item.checked && <Check className="w-3 h-3 text-dark-900" />}
                      </div>
                      <span className="text-sm">{item.ingredient.emoji}</span>
                      <span className={`text-sm flex-1 ${item.checked ? 'line-through text-gray-600' : 'text-cream'}`}>
                        {item.ingredient.name}
                      </span>
                      <span className="text-xs text-gray-500">{item.quantity} {item.unit}</span>
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
