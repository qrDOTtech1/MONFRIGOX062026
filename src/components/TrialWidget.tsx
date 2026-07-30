'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, ChefHat, Clock, Users, ArrowRight, Plus, X, PiggyBank, Leaf, RotateCcw, Recycle, Wallet } from 'lucide-react';
import Celebration from '@/components/Celebration';

// Prix moyen d'un plat équivalent livré (Uber Eats / Deliveroo, plat + frais),
// par personne. Comparé au coût RÉEL de cuisson calculé depuis les ingrédients.
const DELIVERY_PER_SERVING = 13; // €/pers.
const HOME_PER_SERVING_FALLBACK = 3; // € si le coût réel n'a pas pu être estimé

interface TrialRecipe {
  name: string;
  description: string;
  difficulty: string;
  prepTime: number;
  servings: number;
  instructions: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  kind?: 'chef' | 'vide-frigo';
  cost?: number; // coût réel estimé de cuisson (€, plat entier)
}

const SUGGESTIONS = ['Poulet', 'Tomate', 'Pâtes', 'Œufs', 'Courgette', 'Riz', 'Fromage', 'Oignon'];
const SERVINGS_OPTIONS = [1, 2, 4, 6];

// Widget d'essai IA sans compte — réutilisé tel quel sur /essai (destination de pub)
// et comme héros de la page d'accueil (/, "montre, ne raconte pas" à la Suno/OpenArt).
// showHeading=false : masque le pitch interne (utile si la page englobante a déjà son propre titre juste au-dessus).
export default function TrialWidget({ showHeading = true }: { showHeading?: boolean }) {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [servings, setServings] = useState(2);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<TrialRecipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(false);
  const [genCount, setGenCount] = useState(0); // relance les confettis à chaque génération

  function addItem(v: string) {
    const val = v.trim();
    if (val && !items.some(i => i.toLowerCase() === val.toLowerCase())) setItems([...items, val]);
    setInput('');
  }

  async function generate() {
    if (items.length === 0) { setError('Ajoute au moins un ingrédient.'); return; }
    setLoading(true); setError(null); setRecipes([]);
    try {
      const res = await fetch('/api/ai/trial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: items, servings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Erreur, réessaie.');
        if (res.status === 429) setUsed(true);
        return;
      }
      const list = Array.isArray(data.recipes) ? data.recipes : [];
      setRecipes(list);
      setUsed(true);
      if (list.length > 0) setGenCount(c => c + 1); // déclenche les confettis
    } catch { setError('Erreur réseau, réessaie.'); }
    finally { setLoading(false); }
  }

  const hasResult = recipes.length > 0;
  // Coût réel de cuisson (recette du chef) ; repli forfaitaire si non estimable.
  const realCookCost = recipes[0]?.cost && recipes[0].cost > 0.5
    ? Math.round(recipes[0].cost)
    : HOME_PER_SERVING_FALLBACK * servings;
  const deliveryCost = DELIVERY_PER_SERVING * servings;
  const saved = Math.max(5, deliveryCost - realCookCost);

  return (
    <div>
      {hasResult && <Celebration key={genCount} />}

      {/* En-tête */}
      {showHeading && (
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--brand, #2563EB)', fontWeight: 600, marginBottom: 12 }}>
            <Sparkles size={15} /> Essai gratuit — sans inscription
          </div>
          <h1 style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 30, lineHeight: 1.15, marginBottom: 10 }}>
            Dis-moi ce que tu as dans ton frigo,<br />l’IA te trouve des recettes.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Ajoute tes ingrédients, choisis le nombre de convives, et laisse la magie opérer. 👨‍🍳
          </p>
        </div>
      )}

      {!hasResult && (
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

          {/* Sélecteur nombre de personnes */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              <Users size={15} /> Pour combien de personnes ?
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SERVINGS_OPTIONS.map(n => (
                <button key={n} onClick={() => setServings(n)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 12, fontSize: 15, fontWeight: 600,
                    border: `1px solid ${servings === n ? 'var(--brand, #2563EB)' : 'var(--border)'}`,
                    background: servings === n ? 'color-mix(in srgb, var(--brand, #2563EB) 14%, transparent)' : 'var(--bg-inset)',
                    color: servings === n ? 'var(--brand, #2563EB)' : 'var(--text-secondary)',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading || items.length === 0} className="btn-primary w-full"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', fontSize: 16 }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> L’IA cuisine 2 recettes…</> : <><Sparkles size={18} /> Trouve mes recettes</>}
          </button>

          {error && <p style={{ color: 'var(--danger, #ef4444)', fontSize: 14, marginTop: 12, textAlign: 'center' }}>{error}</p>}
        </div>
      )}

      {/* Résultats */}
      {hasResult && (
        <div>
          {recipes.map((recipe, ri) => {
            const steps = recipe.instructions.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean);
            const isVideFrigo = recipe.kind === 'vide-frigo';
            return (
              <div key={ri} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 20, padding: 22, marginBottom: 16 }}>
                {/* Étiquette du type de recette */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, marginBottom: 12,
                  background: isVideFrigo ? 'color-mix(in srgb, var(--success, #22c55e) 14%, transparent)' : 'color-mix(in srgb, var(--brand, #2563EB) 14%, transparent)',
                  color: isVideFrigo ? 'var(--success, #16a34a)' : 'var(--brand, #2563EB)' }}>
                  {isVideFrigo ? <><Recycle size={13} /> Zéro gaspi — utilise tout</> : <><ChefHat size={13} /> La recette du chef</>}
                </div>

                <h2 style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 23, marginBottom: 6 }}>{recipe.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 14 }}>{recipe.description}</p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> {recipe.prepTime} min</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {recipe.servings} pers.</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ChefHat size={14} /> {recipe.difficulty}</span>
                  {typeof recipe.cost === 'number' && recipe.cost > 0.5 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--success, #16a34a)', fontWeight: 600 }}>
                      <Wallet size={14} /> ≈ {recipe.cost.toFixed(2).replace('.', ',')}€ d’ingrédients
                    </span>
                  )}
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
            );
          })}

          {/* Économies — effet anti-gaspi, chiffres crédibles */}
          <div style={{ background: 'color-mix(in srgb, var(--success, #22c55e) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success, #22c55e) 35%, transparent)', borderRadius: 20, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <PiggyBank size={22} style={{ color: 'var(--success, #22c55e)' }} />
              <span style={{ fontFamily: '"Baloo 2", sans-serif', fontSize: 18 }}>
                Tu économises <b style={{ color: 'var(--success, #16a34a)' }}>≈ {saved}€</b> sur ce repas
              </span>
            </div>

            {/* Comparatif chiffré */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, background: 'var(--bg-inset)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>À cuisiner</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success, #16a34a)' }}>≈ {realCookCost}€</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>vs</div>
              <div style={{ flex: 1, background: 'var(--bg-inset)', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Livré ({servings} pers.)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'line-through' }}>≈ {deliveryCost}€</div>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Leaf size={14} style={{ color: 'var(--success, #22c55e)', flexShrink: 0 }} /> Et tu cuisines tes ingrédients <b>avant qu’ils périment</b> — un foyer français jette en moyenne ~<b>500€ de nourriture par an</b>. 🗑️</li>
            </ul>
          </div>

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

          <button
            onClick={() => { setRecipes([]); setError(null); setUsed(false); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, margin: '18px auto 0', color: 'var(--text-muted)', fontSize: 14, background: 'transparent' }}>
            <RotateCcw size={15} /> Tester d’autres ingrédients
          </button>
        </div>
      )}

      {/* Bandeau d'essai déjà utilisé sans recette (cookie déjà posé) */}
      {used && !hasResult && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/register" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px' }}>
            Créer mon compte gratuit <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
