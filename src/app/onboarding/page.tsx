'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Loader2, Refrigerator } from 'lucide-react';

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
  { key: 'Méditerranéenne', emoji: '🫒' },
  { key: 'Indienne',       emoji: '🍛' },
  { key: 'Américaine',     emoji: '🍔' },
  { key: 'Japonaise',      emoji: '🍣' },
  { key: 'Marocaine',      emoji: '🫕' },
  { key: 'Libanaise',      emoji: '🥙' },
];

const SKILL_LEVELS = [
  { key: 'debutant',      label: 'Débutant',      emoji: '🥄', desc: 'Recettes simples, peu de techniques' },
  { key: 'intermediaire', label: 'Intermédiaire', emoji: '🍳', desc: "À l'aise en cuisine, curieux" },
  { key: 'passione',      label: 'Passionné',     emoji: '👨‍🍳', desc: 'Aime explorer, prend son temps' },
  { key: 'chef',          label: 'Chef amateur',  emoji: '⭐', desc: 'Techniques avancées, pas de limite' },
];

const TIME_PREFS = [
  { key: 'rapide',  label: 'Ultra rapide', emoji: '⚡', desc: '< 15 min, cuisine express' },
  { key: 'court',   label: 'Court',        emoji: '🕐', desc: '15 – 30 min pour la majorité' },
  { key: 'modere',  label: 'Modéré',       emoji: '🕑', desc: "30 – 60 min selon l'humeur" },
  { key: 'long',    label: 'Peu importe',  emoji: '🕓', desc: "Le temps qu'il faut" },
];

const GOALS = [
  { key: 'sante',     label: 'Manger équilibré',    emoji: '🥗' },
  { key: 'poids',     label: 'Perdre du poids',     emoji: '⚖️' },
  { key: 'muscle',    label: 'Prendre de la masse', emoji: '💪' },
  { key: 'rapide',    label: 'Gagner du temps',     emoji: '⚡' },
  { key: 'budget',    label: 'Faire des économies', emoji: '💰' },
  { key: 'plaisir',   label: 'Se faire plaisir',    emoji: '😋' },
  { key: 'famille',   label: 'Cuisiner en famille', emoji: '👨‍👩‍👧' },
  { key: 'decouvrir', label: 'Découvrir le monde',  emoji: '🌍' },
];

const MEAL_TYPES = [
  { key: 'BREAKFAST', label: 'Petit-déjeuner', emoji: '🌅' },
  { key: 'LUNCH',     label: 'Déjeuner',       emoji: '🌞' },
  { key: 'DINNER',    label: 'Dîner',          emoji: '🌙' },
  { key: 'SNACK',     label: 'Snacks',         emoji: '🍎' },
];

const TOTAL_STEPS = 9;

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 justify-center mb-6">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="rounded-full transition-all duration-300"
          style={{
            width: i + 1 === current ? 16 : 5, height: 5,
            backgroundColor: i + 1 <= current ? 'var(--accent)' : 'var(--border)',
          }} />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [dietMode,   setDietMode]   = useState('');
  const [allergens,  setAllergens]  = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [timePref,   setTimePref]   = useState('');
  const [goals,      setGoals]      = useState<string[]>([]);
  const [flavors,    setFlavors]    = useState<string[]>([]);
  const [cuisines,   setCuisines]   = useState<string[]>([]);
  const [servings,   setServings]   = useState(2);
  const [mealTypes,  setMealTypes]  = useState<string[]>(['LUNCH', 'DINNER']);
  const [saving,     setSaving]     = useState(false);

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
        tasteProfile: JSON.stringify({ flavors, cuisines, skillLevel, timePref, goals, mealTypes }),
        onboardingDone: true,
      }),
    });
    setSaving(false);
    setStep(10);
  }

  function next() { setStep(s => s + 1); }
  function back() { setStep(s => Math.max(0, s - 1)); }

  if (step === 0) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-6xl mb-6">🍽️</div>
      <div className="flex items-center gap-2 justify-center mb-3">
        <Refrigerator className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        <h1 className="text-2xl font-bold">MonFrigo</h1>
      </div>
      <p className="text-base font-medium mb-2">Bienvenue !</p>
      <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        2 minutes pour personnaliser tes recettes selon tes goûts, objectifs et habitudes.
      </p>
      <p className="text-xs max-w-xs mb-10 px-3 py-2 rounded-xl"
        style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
        🥬 Les recettes avec tes ingrédients du frigo apparaîtront en premier !
      </p>
      <button onClick={next}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        Personnaliser mon expérience
        <ChevronRight className="w-5 h-5" />
      </button>
      <button onClick={finish} className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        Passer pour l&apos;instant
      </button>
    </div>
  );

  if (step === 10) return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center fade-in"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold mb-2">Ton profil est prêt !</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Dans Explorer, les recettes avec tes ingrédients du frigo apparaissent en premier.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {dietMode && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>{DIET_MODES.find(d => d.key === dietMode)?.emoji} {DIET_MODES.find(d => d.key === dietMode)?.label}</span>}
        {allergens.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>⚠️ {allergens.length} allergène{allergens.length>1?'s':''}</span>}
        {skillLevel && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>{SKILL_LEVELS.find(s => s.key === skillLevel)?.emoji} {SKILL_LEVELS.find(s => s.key === skillLevel)?.label}</span>}
        {goals.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>🎯 {goals.length} objectif{goals.length>1?'s':''}</span>}
        {cuisines.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}>🌍 {cuisines.length} cuisine{cuisines.length>1?'s':''}</span>}
      </div>
      <button onClick={() => router.replace('/dashboard')}
        className="w-full max-w-xs flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-semibold transition-all active:scale-[0.97]"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
        Voir mes recettes personnalisées
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-10 pb-8" style={{ backgroundColor: 'var(--bg)' }}>
      {step > 1 && (
        <button onClick={back} className="self-start mb-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--bg-raised)' }}>
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
      <StepDots current={step} />
      <p className="text-center text-xs mb-5" style={{ color: 'var(--text-muted)', marginTop: '-0.75rem' }}>
        Étape {step} sur {TOTAL_STEPS}
      </p>

      <div className="flex-1 fade-in">

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

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Allergies ou intolérances ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Sélectionne tout ce qui s&apos;applique</p>
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

        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Ton niveau en cuisine ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Pour adapter la complexité des recettes proposées</p>
            <div className="space-y-2">
              {SKILL_LEVELS.map(s => {
                const on = skillLevel === s.key;
                return (
                  <button key={s.key} onClick={() => setSkillLevel(s.key)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-3xl">{s.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{s.label}</p>
                      <p className="text-xs mt-0.5" style={{ opacity: 0.65 }}>{s.desc}</p>
                    </div>
                    {on && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Temps disponible ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>En semaine, combien de temps passes-tu en cuisine ?</p>
            <div className="space-y-2">
              {TIME_PREFS.map(t => {
                const on = timePref === t.key;
                return (
                  <button key={t.key} onClick={() => setTimePref(t.key)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-3xl">{t.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-xs mt-0.5" style={{ opacity: 0.65 }}>{t.desc}</p>
                    </div>
                    {on && <Check className="w-5 h-5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Tes objectifs ?</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Ce qui compte le plus pour toi (plusieurs choix)</p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => {
                const on = goals.includes(g.key);
                return (
                  <button key={g.key} onClick={() => toggleArr(goals, g.key, setGoals)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-sm font-medium leading-tight">{g.label}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 6 && (
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

        {step === 7 && (
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

        {step === 8 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Ton foyer</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Portions habituelles et repas cuisinés</p>
            <p className="text-sm font-semibold mb-3">Nombre de personnes à table</p>
            <div className="flex items-center justify-center gap-6 mb-5">
              <button onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1.5px solid var(--border)' }}>
                −
              </button>
              <div className="text-center min-w-[60px]">
                <p className="text-5xl font-bold">{servings}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>personne{servings > 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setServings(Math.min(20, servings + 1))}
                className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1.5px solid var(--border)' }}>
                +
              </button>
            </div>
            <div className="flex gap-2 justify-center mb-7">
              {[1, 2, 4, 6, 8].map(n => (
                <button key={n} onClick={() => setServings(n)}
                  className="w-10 h-10 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: servings === n ? 'var(--accent)' : 'var(--bg-raised)',
                    color: servings === n ? 'var(--accent-text)' : 'var(--text)',
                    border: `1.5px solid ${servings === n ? 'var(--accent)' : 'var(--border)'}`,
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold mb-3">Repas que tu cuisines</p>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map(m => {
                const on = mealTypes.includes(m.key);
                return (
                  <button key={m.key} onClick={() => toggleArr(mealTypes, m.key, setMealTypes)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                    style={{
                      backgroundColor: on ? 'var(--accent)' : 'var(--bg-raised)',
                      color: on ? 'var(--accent-text)' : 'var(--text)',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-sm font-medium">{m.label}</span>
                    {on && <Check className="w-4 h-4 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 9 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Ton profil culinaire 🎯</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Vérifie tes préférences avant de sauvegarder</p>
            <div className="space-y-2 mb-8">
              {[
                { emoji: '🍽️', label: 'Régime',    value: DIET_MODES.find(d => d.key === dietMode)?.label || 'Aucun' },
                { emoji: '⚠️', label: 'Allergènes', value: allergens.length > 0 ? allergens.map(k => ALLERGENS.find(a => a.key === k)?.label).join(', ') : 'Aucun' },
                { emoji: '👨‍🍳', label: 'Niveau',     value: SKILL_LEVELS.find(s => s.key === skillLevel)?.label || 'Non renseigné' },
                { emoji: '⏱️', label: 'Temps',      value: TIME_PREFS.find(t => t.key === timePref)?.label || 'Non renseigné' },
                { emoji: '🎯', label: 'Objectifs',  value: goals.length > 0 ? goals.map(k => GOALS.find(g => g.key === k)?.label).join(', ') : 'Non renseigné' },
                { emoji: '👅', label: 'Saveurs',    value: flavors.length > 0 ? flavors.map(k => FLAVORS.find(f => f.key === k)?.label).join(', ') : 'Non renseigné' },
                { emoji: '🌍', label: 'Cuisines',   value: cuisines.length > 0 ? cuisines.slice(0, 3).join(', ') + (cuisines.length > 3 ? ` +${cuisines.length - 3}` : '') : 'Non renseigné' },
                { emoji: '👥', label: 'Portions',   value: `${servings} personne${servings > 1 ? 's' : ''}` },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <span className="text-lg mt-0.5">{row.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-sm font-medium mt-0.5 truncate">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button onClick={back} className="flex-1 py-3.5 rounded-2xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            Retour
          </button>
        )}
        {step < 9 ? (
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

      {step <= 8 && (
        <button onClick={next} className="text-center mt-3 text-xs py-1" style={{ color: 'var(--text-muted)' }}>
          Passer cette étape
        </button>
      )}
    </div>
  );
}