'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Loader2, Refrigerator } from 'lucide-react';

/* ── Data ── */
const DIET_MODES = [
  { key: '', label: 'Tout mange', emoji: '🍽️' },
  { key: 'vegetarien', label: 'Végétarien', emoji: '🥗' },
  { key: 'vegan', label: 'Vegan', emoji: '🌱' },
  { key: 'halal', label: 'Halal', emoji: '☪️' },
  { key: 'casher', label: 'Casher', emoji: '✡️' },
  { key: 'sans-porc', label: 'Sans porc', emoji: '🚫🐷' },
  { key: 'sans-sucre', label: 'Sans sucre', emoji: '🚫🍬' },
  { key: 'keto', label: 'Keto', emoji: '🥑' },
];

const ALLERGENS = [
  { key: 'gluten',          label: 'Gluten',         emoji: '🌾' },
  { key: 'lactose',         label: 'Lactose',        emoji: '🥛' },
  { key: 'oeufs',           label: 'Œufs',           emoji: '🥚' },
  { key: 'arachides',       label: 'Arachides',      emoji: '🥜' },
  { key: 'fruits-a-coque',  label: 'Fruits à coque', emoji: '🌰' },
  { key: 'soja',            label: 'Soja',           emoji: '🫘' },
  { key: 'poisson',         label: 'Poisson',        emoji: '🐟' },
  { key: 'crustaces',       label: 'Crustacés',      emoji: '🦐' },
  { key: 'celeri',          label: 'Céleri',         emoji: '🥬' },
  { key: 'moutarde',        label: 'Moutarde',       emoji: '🟡' },
  { key: 'sesame',          label: 'Sésame',         emoji: '⚪' },
  { key: 'sulfites',        label: 'Sulfites',       emoji: '🍷' },
];

const FLAVORS = [
  { key: 'epice',  label: 'Épicé',   emoji: '🌶️', desc: 'piment, curry fort' },
  { key: 'sucre',  label: 'Sucré',   emoji: '🍯', desc: 'desserts, fruits' },
  { key: 'sale',   label: 'Salé',    emoji: '🧂', desc: 'snacks, charcuterie' },
  { key: 'acide',  label: 'Acide',   emoji: '🍋', desc: 'citron, vinaigre' },
  { key: 'umami',  label: 'Umami',   emoji: '🍄', desc: 'champignons, bouillon' },
  { key: 'amer',   label: 'Amer',    emoji: '☕', desc: 'café, endives' },
];

const CUISINES = [
  { key: 'Française',      emoji: '🥐' },
  { key: 'Italienne',      emoji: '🍕' },
  { key: 'Asiatique',      emoji: '🍜' },
  { key: 'Mexicaine',      emoji: '🌮' },
  { key: 'Méditerranéenne',emoji: '🫒' },
  { key: 'Indienne',       emoji: '🍛' },
  { key: 'Américaine',     emoji: '🍔' },
  { key: 'Japonaise',      emoji: '🍣' },
  { key: 'Marocaine',      emoji: '🫕' },
  { key: 'Libanaise',      emoji: '🥙' },
];

const TOTAL_STEPS = 6; // Steps 1-6 (excl. welcome + done)

/* ── Step indicator ── */
function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 20 : 6, height: 6,
            backgroundColor: i + 1 <= current ? 'var(--accent)' : 'var(--border)',
          }} />
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=welcome, 1-6=steps, 7=done

  // State
  const [dietMode,    setDietMode]    = useState('');
  const [allergens,   setAllergens]   = useState<string[]>([]);
  const [flavors,     setFlavors]     = useState<string[]>([]);
  const [cuisines,    setCuisines]    = useState<string[]>([]);
  const [servings,    setServings]    = useState(2);
  const [saving,      setSaving]      = useState(false);

  function toggleArr<T extends string>(arr: T[], val: T, setArr: (a: T[]) => void) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }

  async function finish() {
    setSaving(true);
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dietMode,
        allergens: JSON.stringify(allergens),
        defaultServings: servings,
        tasteProfile: JSON.stringify({ flavors, cuisines }),
        onboardingDone: true,
      }),
    });
    setSaving(false);
    setStep(7);
  }

  function next() { setStep(s => s + 1); }
  function back() { setStep(s => Math.max(0, s - 1)); }

  /* ── Screens ── */

  /* 0 - Welcome */
  if (step === 0) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-6xl mb-6">🍽️</div>
      <div className="flex items-center gap-2 justify-center mb-3">
        <Refrigerator className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-2xl font-bold">MonFrigo</h1>
      </div>
      <p className="text-base font-medium mb-2">Bienvenue !</p>
      <p className="text-sm max-w-xs mb-10" style={{ color: 'var(--text-muted)' }}>
        Quelques questions rapides pour personnaliser tes recettes selon tes goûts, allergies et habitudes.
      </p>
      <button onClick={next}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        Personnaliser mon expérience
        <ChevronRight className="w-5 h-5" />
      </button>
      <button onClick={() => { finish(); }}
        className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        Passer pour l&apos;instant
      </button>
    </div>
  );

  /* 7 - Done */
  if (step === 7) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Ton profil est prêt !</h1>
      <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
        Tes recettes sont maintenant personnalisées.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {dietMode && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>{DIET_MODES.find(d => d.key === dietMode)?.emoji} {DIET_MODES.find(d => d.key === dietMode)?.label}</span>}
        {allergens.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--text-secondary)' }}>⚠️ {allergens.length} allergène{allergens.length>1?'s':''}</span>}
        {flavors.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>👅 {flavors.length} saveur{flavors.length>1?'s':''}</span>}
        {cuisines.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>🌍 {cuisines.length} cuisine{cuisines.length>1?'s':''}</span>}
      </div>
      <button onClick={() => router.replace('/fridge')}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        Explorer mes recettes
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  /* Steps 1-6 */
  return (
    <div className="min-h-dvh flex flex-col px-6 pt-12 pb-8" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Back button */}
      {step > 1 && (
        <button onClick={back} className="self-start mb-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--bg-inset)]">
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
      )}

      <StepDots current={step} />

      <div className="flex-1 fade-in">

        {/* Step 1 — Diet */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Comment tu manges ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sélectionne ton régime alimentaire</p>
            <div className="grid grid-cols-2 gap-2">
              {DIET_MODES.map(d => (
                <button key={d.key} onClick={() => setDietMode(d.key)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: dietMode === d.key ? 'var(--accent)' : 'var(--bg-raised)',
                    color: dietMode === d.key ? 'var(--accent-text)' : 'var(--text)',
                    border: `1.5px solid ${dietMode === d.key ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  <span className="text-xl">{d.emoji}</span>
                  <span className="text-sm font-medium">{d.label}</span>
                  {dietMode === d.key && <Check className="w-4 h-4 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2 — Allergens */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Allergies ou intolérances ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sélectionne tout ce qui s&apos;applique — ou passe si aucune</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ALLERGENS.map(a => {
                const on = allergens.includes(a.key);
                return (
                  <button key={a.key} onClick={() => toggleArr(allergens, a.key, setAllergens)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: on ? 'rgba(239,68,68,0.1)' : 'var(--bg-raised)',
                      color: on ? '#ef4444' : 'var(--text)',
                      border: `1.5px solid ${on ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                    }}>
                    <span>{a.emoji}</span> {a.label}
                    {on && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            {allergens.length > 0 && (
              <button onClick={() => setAllergens([])} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Tout désélectionner
              </button>
            )}
          </>
        )}

        {/* Step 3 — Flavors */}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Tes saveurs préférées ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Plusieurs choix possibles</p>
            <div className="space-y-2">
              {FLAVORS.map(f => {
                const on = flavors.includes(f.key);
                return (
                  <button key={f.key} onClick={() => toggleArr(flavors, f.key, setFlavors)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-3xl">{f.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{f.label}</p>
                      <p className="text-xs mt-0.5" style={{ opacity: 0.65 }}>{f.desc}</p>
                    </div>
                    {on && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step 4 — Cuisines */}
        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Cuisines du monde ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Tes cuisines préférées (plusieurs choix)</p>
            <div className="grid grid-cols-2 gap-2">
              {CUISINES.map(c => {
                const on = cuisines.includes(c.key);
                return (
                  <button key={c.key} onClick={() => toggleArr(cuisines, c.key, setCuisines)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xl">{c.emoji}</span>
                    <span className="text-sm font-medium">{c.key}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step 5 — Servings */}
        {step === 5 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Combien de personnes ?</h2>
            <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>Les portions s&apos;adapteront automatiquement</p>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-6 mb-8">
                <button onClick={() => setServings(Math.max(1, servings - 1))}
                  className="w-14 h-14 rounded-full text-2xl font-bold flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1.5px solid var(--border)' }}>
                  −
                </button>
                <div className="text-center">
                  <p className="text-6xl font-bold">{servings}</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    personne{servings > 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => setServings(Math.min(20, servings + 1))}
                  className="w-14 h-14 rounded-full text-2xl font-bold flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1.5px solid var(--border)' }}>
                  +
                </button>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                {[1, 2, 4, 6, 8].map(n => (
                  <button key={n} onClick={() => setServings(n)}
                    className="w-12 h-12 rounded-full text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: servings === n ? 'var(--accent)' : 'var(--bg-raised)',
                      color: servings === n ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${servings === n ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 6 — Recap */}
        {step === 6 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Tout est prêt !</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Voici ton profil culinaire</p>
            <div className="space-y-3 mb-8">
              {[
                { emoji: '🍽️', label: 'Régime', value: DIET_MODES.find(d => d.key === dietMode)?.label || 'Aucun' },
                { emoji: '⚠️', label: 'Allergènes', value: allergens.length > 0 ? allergens.map(k => ALLERGENS.find(a => a.key === k)?.label).join(', ') : 'Aucun' },
                { emoji: '👅', label: 'Saveurs', value: flavors.length > 0 ? flavors.map(k => FLAVORS.find(f => f.key === k)?.label).join(', ') : 'Non renseigné' },
                { emoji: '🌍', label: 'Cuisines', value: cuisines.length > 0 ? cuisines.slice(0,3).join(', ') + (cuisines.length > 3 ? ` +${cuisines.length-3}` : '') : 'Non renseigné' },
                { emoji: '👥', label: 'Portions', value: `${servings} personne${servings > 1 ? 's' : ''}` },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 p-3.5 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <span className="text-xl">{row.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-sm font-medium mt-0.5">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button onClick={back} className="flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Retour
          </button>
        )}
        {step < 6 ? (
          <button onClick={next} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={finish} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Enregistrement…' : 'Sauvegarder mon profil'}
          </button>
        )}
      </div>

      {/* Skip */}
      {step <= 5 && (
        <button onClick={next} className="text-center mt-3 text-xs py-1" style={{ color: 'var(--text-muted)' }}>
          Passer cette étape
        </button>
      )}
    </div>
  );
}
