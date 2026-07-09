'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, ChefHat, Clock, Users, ArrowRight, Plus, X, PiggyBank, Leaf } from 'lucide-react';

// Estimation simple des économies : cuisiner ce plat maison plutôt que
// commander une livraison équivalente. Volontairement prudent pour rester crédible.
const DELIVERY_PER_SERVING = 12; // € : un plat livré type
const HOME_PER_SERVING = 3;      // € : coût maison estimé

interface TrialRecipe {
  name: string;
  description: string;
  difficulty: string;
  prepTime: number;
  servings: number;
  instructions: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
}

const SUGGESTIONS = ['Poulet', 'Tomate', 'Pâtes', 'Œufs', 'Courgette', 'Riz', 'Fromage', 'Oignon'];

export default function EssaiPage() {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<TrialRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(false);

  function addItem(v: string) {
    const val = v.trim();
    if (val && !items.some(i => i.toLowerCase() === val.toLowerCase())) setItems([...items, val]);
    setInput('');
  }

  async function generate() {
    if (items.length === 0) { setError('Ajoute au moins un ingrédient.'); return; }
    setLoading(true); setError(null); setRecipe(null);
    try {
      const res = await fetch('/api/ai/trial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Erreur, réessaie.');
        if (res.status === 429) setUsed(true);
        return;
      }
      setRecipe(data.recipe);
      setUsed(true);
    } catch { setError('Erreur réseau, réessaie.'); }
    finally { setLoading(false); }
  }

  const steps = recipe ? recipe.instructions.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean) : [];

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px 64px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--brand, #2563EB)', fontWeight: 600, marginBottom: 12 }}>
            <Sparkles size={15} /> Essai gratuit — sans inscription
          </div>
          <h1 style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 30, lineHeight: 1.15, marginBottom: 10 }}>
            Dis-moi ce que tu as dans ton frigo,<br />l’IA te trouve une recette.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Ajoute quelques ingrédients et laisse la magie opérer. 👨‍🍳
          </p>
        </div>

        {!recipe && (
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 20 }}>
            {/* Chips ingrédients */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {items.map(it => (
                <span key={it} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 10px', fontSize: 14 }}>
                  {it}
                  <button onClick={() => setItems(items.filter(i => i !== it))} style={{ display: 'inline-flex', color: 'var(--text-muted)' }}><X size={13} /></button>
                </span>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Tape tes vrais ingrédients 👇
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem(input); }}
                placeholder="Ex : saumon, épinards, citron…"
                autoFocus
                style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-inset)', color: 'var(--text)', fontSize: 15 }}
              />
              <button onClick={() => addItem(input)} className="btn-secondary !px-3" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Plus size={18} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Appuie sur Entrée après chaque ingrédient. Le plus réaliste : mets ce que tu as vraiment chez toi.
            </p>

            {/* Exemples rapides (optionnels) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ou pioche un exemple :</span>
              {SUGGESTIONS.filter(s => !items.includes(s)).slice(0, 5).map(s => (
                <button key={s} onClick={() => addItem(s)} style={{ fontSize: 13, padding: '5px 11px', borderRadius: 999, border: '1px dashed var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}>
                  + {s}
                </button>
              ))}
            </div>

            <button onClick={generate} disabled={loading || items.length === 0} className="btn-primary w-full"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', fontSize: 16 }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> L’IA cuisine…</> : <><Sparkles size={18} /> Trouve ma recette</>}
            </button>

            {error && <p style={{ color: 'var(--danger, #ef4444)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</p>}
          </div>
        )}

        {/* Résultat */}
        {recipe && (
          <div>
            <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 22, marginBottom: 20 }}>
              <h2 style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 24, marginBottom: 6 }}>{recipe.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 14 }}>{recipe.description}</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> {recipe.prepTime} min</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {recipe.servings} pers.</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ChefHat size={14} /> {recipe.difficulty}</span>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ingrédients</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--text-secondary)' }}>• {ing.quantity} {ing.unit} {ing.name}</li>
                ))}
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Préparation</h3>
              <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((s, i) => (
                  <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{s}</li>
                ))}
              </ol>
            </div>

            {/* Économies — effet anti-gaspi */}
            {(() => {
              const saved = Math.max(6, Math.round((DELIVERY_PER_SERVING - HOME_PER_SERVING) * (recipe.servings || 2)));
              return (
                <div style={{ background: 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success, #22c55e) 35%, transparent)', borderRadius: 20, padding: 18, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <PiggyBank size={22} style={{ color: 'var(--success, #22c55e)' }} />
                    <span style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 18 }}>
                      En cuisinant ce plat, tu économises <b style={{ color: 'var(--success, #16a34a)' }}>≈ {saved}€</b>
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 7 }}><ArrowRight size={13} style={{ color: 'var(--success, #22c55e)' }} /> vs commander une livraison (~{DELIVERY_PER_SERVING}€/pers.)</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Leaf size={13} style={{ color: 'var(--success, #22c55e)' }} /> et <b>0 gaspillage</b> : tes ingrédients finissent dans l’assiette, pas à la poubelle</li>
                  </ul>
                </div>
              );
            })()}

            {/* CTA conversion */}
            <div style={{ background: 'linear-gradient(135deg, var(--brand, #2563EB), #4f46e5)', borderRadius: 20, padding: 24, textAlign: 'center', color: '#fff' }}>
              <p style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 20, marginBottom: 6 }}>Pas mal, non ? 😍</p>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>
                Imagine ça <b>chaque semaine</b> : des recettes avec ce que tu as déjà, moins de gaspillage et moins de livraisons.<br />
                Crée ton compte gratuit — scan du frigo, recettes à volonté, mode cuisine pas-à-pas.<br />
                <b>Et profite d’1 mois Premium offert.</b>
              </p>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: 'var(--brand, #2563EB)', fontWeight: 600, padding: '12px 22px', borderRadius: 12, fontSize: 15 }}>
                Créer mon compte gratuit <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        )}

        {/* Bandeau d'essai déjà utilisé sans recette (cookie déjà posé) */}
        {used && !recipe && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px' }}>
              Créer mon compte gratuit <ArrowRight size={17} />
            </Link>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
          Déjà un compte ? <Link href="/login" style={{ color: 'var(--brand, #2563EB)' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
