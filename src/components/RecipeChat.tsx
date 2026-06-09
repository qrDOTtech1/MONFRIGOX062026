'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Send, Loader2, ChefHat, Sparkles } from 'lucide-react';
import RecipeCard from './RecipeCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recipeIds?: string[];
  recipes?: RecipeMini[];
}

interface RecipeMini {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  matchPercent?: number;
  matchCount?: string;
  ingredients?: Array<{ ingredient: { emoji: string } }>;
}

const SUGGESTIONS = [
  'Quelque chose de rapide ce soir ?',
  'Recette végétarienne ?',
  'Sans gluten ?',
  'Avec du poulet et des légumes ?',
  'Moins de 20 minutes ?',
  'Un plat réconfortant ?',
];

export default function RecipeChat({ allRecipes }: { allRecipes: RecipeMini[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Salut ! Dis-moi ce que tu cherches — un ingrédient, une envie, un régime, un temps de préparation… Je trouve la recette parfaite parmi celles disponibles. 🍽️',
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      // Récupérer les recettes mentionnées depuis le cache local
      const mentionedRecipes = (data.recipeIds as string[] || [])
        .map((rid: string) => allRecipes.find(r => r.id === rid))
        .filter(Boolean) as RecipeMini[];

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply,
        recipeIds: data.recipeIds,
        recipes: mentionedRecipes,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Une erreur est survenue, réessaie.',
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, allRecipes]);

  // Keyboard shortcut: Escape ferme
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
        aria-label="Assistant recette"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Panel */}
          <div
            className="mt-auto w-full max-w-lg mx-auto flex flex-col rounded-t-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg)',
              height: '82vh',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-raised)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--bg-inset)' }}>
                <ChefHat className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold">Assistant recette</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Trouve dans {allRecipes.length} recette{allRecipes.length !== 1 ? 's' : ''} disponibles
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-2 rounded-lg transition-colors hover:bg-[var(--bg-inset)]"
              >
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: 'var(--bg-inset)' }}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                  <div className="max-w-[80%] space-y-2">
                    <div
                      className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={msg.role === 'user'
                        ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)', borderBottomRightRadius: '4px' }
                        : { backgroundColor: 'var(--bg-raised)', color: 'var(--text)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }
                      }
                    >
                      {msg.content}
                    </div>

                    {/* Recettes suggérées */}
                    {msg.recipes && msg.recipes.length > 0 && (
                      <div className="space-y-2 mt-1">
                        {msg.recipes.map(r => (
                          <Link
                            key={r.id}
                            href={`/recipes/${r.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--bg-inset)]"
                            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                          >
                            {r.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.imageUrl} alt={r.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                                style={{ backgroundColor: 'var(--bg-inset)' }}>
                                {r.ingredients?.[0]?.ingredient?.emoji || '🍽️'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.name}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {r.prepTime} min · {r.cuisine}
                              </p>
                            </div>
                            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>→</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start gap-2">
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-inset)' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="px-3.5 py-3 rounded-2xl flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: 'var(--text-muted)', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggestions rapides (seulement si peu de messages) */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 hover:opacity-80"
                      style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shrink-0"
              style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-raised)' }}>
              <form
                onSubmit={e => { e.preventDefault(); send(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ton envie du moment…"
                  className="input-field flex-1 !py-2.5"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
