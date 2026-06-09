'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChefHat, Clock, X, Timer, Check, Users, Camera } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  prepTime: number;
  servings: number;
  difficulty: string;
  ingredients: Array<{
    quantity: number;
    unit: string;
    ingredient: { name: string; emoji: string };
    inFridge: boolean;
  }>;
  instructions: string;
}

// Découpe les instructions en étapes, peu importe le format reçu
// (sauts de ligne, listes numérotées "1.", puces, ou un seul paragraphe).
function parseSteps(raw: string): string[] {
  if (!raw) return [];
  let text = raw.trim();

  // 1) Sauts de ligne réels OU littéraux ("\n" stocké en texte)
  let parts = text.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return cleanSteps(parts);

  // 2) Listes numérotées : "1. ...", "2) ...", "Étape 3 :"
  parts = text
    .split(/(?=(?:\d+[\.\)]\s)|(?:étape\s*\d+\s*[:.\-]?\s))/i)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return cleanSteps(parts);

  // 3) Dernier recours : découpe par phrases
  parts = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖÀ-Ý])/)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return cleanSteps(parts);

  return [text];
}

// Retire les préfixes de numérotation ("1.", "2)", "Étape 1 :", "- ")
function cleanSteps(steps: string[]): string[] {
  return steps
    .map(s => s.replace(/^\s*(?:étape\s*\d+\s*[:.\-]?\s*|\d+[\.\)]\s*|[-•*]\s*)/i, '').trim())
    .filter(Boolean);
}

export default function CookModePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [step, setStep] = useState(-1);
  const [steps, setSteps] = useState<string[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [resultPhoto, setResultPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setRecipe(data);
          setSteps(parseSteps(data.instructions));
        }
      });
  }, [id]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, []);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const totalSteps = steps.length;
  const progress = step === -1 ? 0 : ((step + 1) / totalSteps) * 100;

  function next() {
    if (step < totalSteps - 1) {
      setStep(step + 1);
      detectTimer(steps[step + 1]);
    } else {
      setDone(true);
    }
  }

  function prev() {
    if (step > -1) setStep(step - 1);
  }

  function detectTimer(text: string) {
    const match = text.match(/(\d+)\s*min/i);
    if (match) {
      const mins = parseInt(match[1]);
      setTimer(mins);
      setTimerSeconds(mins * 60);
      setTimerRunning(false);
    } else {
      setTimer(null);
    }
  }

  function toggleIngredient(idx: number) {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    if (e.key === 'Escape') router.back();
  }, [step, totalSteps]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!recipe) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 px-6" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center fade-in w-full max-w-sm">
          <div className="text-5xl mb-5">🎉</div>
          <h1 className="text-2xl font-semibold mb-2">Bon appétit!</h1>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{recipe.name} est prêt</p>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Pour {recipe.servings} personne{recipe.servings > 1 ? 's' : ''}</p>

          {/* Photo du résultat final */}
          {resultPhoto ? (
            <div className="mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resultPhoto} alt="Ton plat" className="w-full rounded-xl mb-2" style={{ border: '1px solid var(--border)' }} />
              <button onClick={() => setResultPhoto(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Changer la photo
              </button>
            </div>
          ) : (
            <label className="card flex flex-col items-center justify-center gap-2 py-8 mb-6 cursor-pointer transition-colors hover:bg-[var(--bg-inset)]">
              <Camera className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-medium">Prends ton plat en photo</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Immortalise le résultat 📸</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setResultPhoto(URL.createObjectURL(file));
                }}
              />
            </label>
          )}

          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">Retour</button>
            <button onClick={() => { setStep(-1); setDone(false); setResultPhoto(null); }} className="btn-primary">Refaire</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none" style={{ backgroundColor: 'var(--bg)' }}>
      <header className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
          <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <div className="text-center flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mode cuisine</p>
          <p className="text-sm font-medium truncate px-4">{recipe.name}</p>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock className="w-3.5 h-3.5" />
          {recipe.prepTime}min
        </div>
      </header>

      <div className="h-0.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === -1 ? (
          <div className="max-w-lg mx-auto px-6 py-8 fade-in">
            <h2 className="text-lg font-semibold mb-1">Prépare tes ingrédients</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Coche chaque ingrédient quand il est prêt</p>

            <div className="flex items-center gap-3 mb-5">
              <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}><Users className="w-3 h-3 mr-1" />{recipe.servings} pers.</span>
              <span className="badge" style={{ backgroundColor: 'var(--bg-inset)', color: 'var(--text-secondary)' }}><Clock className="w-3 h-3 mr-1" />{recipe.prepTime} min</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalSteps} étapes</span>
            </div>

            <div className="space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <button
                  key={i}
                  onClick={() => toggleIngredient(i)}
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors text-left hover:bg-[var(--bg-inset)]"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    checkedIngredients.has(i) ? 'bg-[var(--accent)] border-[var(--accent)]' : ''
                  }`} style={!checkedIngredients.has(i) ? { borderColor: 'var(--border)' } : undefined}>
                    {checkedIngredients.has(i) && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />}
                  </div>
                  <span className="text-base">{ing.ingredient.emoji}</span>
                  <span className={`flex-1 text-sm ${checkedIngredients.has(i) ? 'line-through' : ''}`} style={{ color: checkedIngredients.has(i) ? 'var(--text-muted)' : 'var(--text)' }}>
                    {ing.ingredient.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ing.quantity} {ing.unit}</span>
                </button>
              ))}
            </div>

            <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
              {checkedIngredients.size}/{recipe.ingredients.length} prêts
            </p>
          </div>
        ) : (
          <div className="max-w-lg mx-auto px-6 py-8 fade-in" key={step}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-inset)' }}>
                <span className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>{step + 1}</span>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Étape {step + 1} sur {totalSteps}</p>
              </div>
            </div>

            <p className="text-lg leading-relaxed font-light mb-8">
              {steps[step]}
            </p>

            {timer !== null && (
              <div className="card p-5 text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Timer className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Minuteur</span>
                </div>
                <p className={`text-3xl font-mono font-semibold mb-4 ${timerSeconds === 0 && !timerRunning && timer ? 'text-emerald-500' : ''}`}>
                  {formatTime(timerSeconds)}
                </p>
                <div className="flex gap-2 justify-center">
                  {!timerRunning ? (
                    <button
                      onClick={() => { if (timerSeconds === 0) setTimerSeconds(timer! * 60); setTimerRunning(true); }}
                      className="btn-primary !py-2 !px-5 text-sm"
                    >
                      {timerSeconds === 0 ? 'Relancer' : 'Démarrer'}
                    </button>
                  ) : (
                    <button onClick={() => setTimerRunning(false)} className="btn-secondary !py-2 !px-5 text-sm">
                      Pause
                    </button>
                  )}
                  <button
                    onClick={() => { setTimerSeconds(timer! * 60); setTimerRunning(false); }}
                    className="btn-secondary !py-2 !px-4 text-sm"
                  >
                    Reset
                  </button>
                </div>
                {timerSeconds === 0 && (
                  <p className="text-emerald-500 text-sm mt-3 font-medium animate-pulse">C&apos;est prêt!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4" style={{ backgroundColor: 'var(--bg-raised)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <button
            onClick={prev}
            disabled={step === -1}
            className="btn-secondary !py-2.5 !px-3.5 disabled:opacity-20"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="btn-primary flex-1 !py-2.5 flex items-center justify-center gap-2">
            {step === -1 ? (
              <><ChefHat className="w-4 h-4" /> C&apos;est parti!</>
            ) : step === totalSteps - 1 ? (
              <><Check className="w-4 h-4" /> Terminé</>
            ) : (
              <>Suivant <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
