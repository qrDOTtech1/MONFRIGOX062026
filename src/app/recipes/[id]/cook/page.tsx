'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChefHat, Clock, X, Timer, Check, Flame, Users } from 'lucide-react';

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

export default function CookModePage() {
  const { id } = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [step, setStep] = useState(-1); // -1 = intro/ingredients, 0+ = steps
  const [steps, setSteps] = useState<string[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setRecipe(data);
          const parsed = data.instructions.split('\n').filter((s: string) => s.trim());
          setSteps(parsed);
        }
      });
  }, [id]);

  // Keep screen awake
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => { wakeLock = wl; }).catch(() => {});
    }
    return () => { wakeLock?.release(); };
  }, []);

  // Timer
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
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
        <div className="w-10 h-10 border-2 border-fresh-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50 px-6">
        <div className="text-center fade-in">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-3">Bon appétit!</h1>
          <p className="text-gray-400 mb-2">{recipe.name} est prêt</p>
          <p className="text-gray-600 text-sm mb-8">Pour {recipe.servings} personne{recipe.servings > 1 ? 's' : ''}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">Retour</button>
            <button onClick={() => { setStep(-1); setDone(false); }} className="btn-primary">Refaire</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-dark-900 z-50 flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-dark-800/80 backdrop-blur-lg">
        <button onClick={() => router.back()} className="p-2 hover:bg-dark-700 rounded-xl transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <div className="text-center flex-1">
          <p className="text-xs text-gray-500 font-medium">MODE CUISINE</p>
          <p className="text-sm font-semibold truncate px-4">{recipe.name}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {recipe.prepTime}min
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-dark-800">
        <div className="h-full bg-fresh-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === -1 ? (
          /* Ingredient checklist */
          <div className="max-w-lg mx-auto px-6 py-8 fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="w-6 h-6 text-fresh-500" />
              <h2 className="text-xl font-bold">Prépare tes ingrédients</h2>
            </div>
            <p className="text-gray-500 text-sm mb-6">Coche chaque ingrédient quand il est prêt</p>

            <div className="flex items-center gap-4 mb-6">
              <span className="badge bg-dark-600 text-gray-300"><Users className="w-3 h-3 mr-1" />{recipe.servings} pers.</span>
              <span className="badge bg-dark-600 text-gray-300"><Clock className="w-3 h-3 mr-1" />{recipe.prepTime} min</span>
              <span className="text-xs text-gray-500">{totalSteps} étapes</span>
            </div>

            <div className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <button
                  key={i}
                  onClick={() => toggleIngredient(i)}
                  className="w-full flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-dark-700/40 transition-colors text-left"
                >
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    checkedIngredients.has(i) ? 'bg-fresh-500 border-fresh-500' : 'border-gray-600'
                  }`}>
                    {checkedIngredients.has(i) && <Check className="w-4 h-4 text-dark-900" />}
                  </div>
                  <span className="text-lg">{ing.ingredient.emoji}</span>
                  <span className={`flex-1 ${checkedIngredients.has(i) ? 'line-through text-gray-600' : 'text-cream'}`}>
                    {ing.ingredient.name}
                  </span>
                  <span className="text-sm text-gray-500">{ing.quantity} {ing.unit}</span>
                </button>
              ))}
            </div>

            <p className="text-center text-gray-600 text-xs mt-8">
              {checkedIngredients.size}/{recipe.ingredients.length} prêts
            </p>
          </div>
        ) : (
          /* Step view */
          <div className="max-w-lg mx-auto px-6 py-8 fade-in" key={step}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-fresh-500/20 rounded-2xl flex items-center justify-center">
                <span className="text-fresh-400 text-xl font-bold">{step + 1}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Étape {step + 1} sur {totalSteps}</p>
                <p className="text-xs text-gray-600">Swipe ou utilise les flèches</p>
              </div>
            </div>

            <p className="text-xl leading-relaxed text-cream font-light mb-8">
              {steps[step]}
            </p>

            {/* Timer */}
            {timer !== null && (
              <div className="glass-card p-5 text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Timer className="w-5 h-5 text-fresh-500" />
                  <span className="text-sm text-gray-400">Minuteur</span>
                </div>
                <p className={`text-4xl font-mono font-bold mb-4 ${timerSeconds === 0 && timerRunning === false && timer ? 'text-fresh-400' : 'text-cream'}`}>
                  {formatTime(timerSeconds)}
                </p>
                <div className="flex gap-2 justify-center">
                  {!timerRunning ? (
                    <button
                      onClick={() => { if (timerSeconds === 0) setTimerSeconds(timer! * 60); setTimerRunning(true); }}
                      className="btn-primary !py-2 !px-6 text-sm"
                    >
                      {timerSeconds === 0 ? 'Relancer' : 'Démarrer'}
                    </button>
                  ) : (
                    <button onClick={() => setTimerRunning(false)} className="btn-secondary !py-2 !px-6 text-sm">
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
                  <p className="text-fresh-400 text-sm mt-3 font-medium animate-pulse">C&apos;est prêt!</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 py-4 bg-dark-800/80 backdrop-blur-lg border-t border-dark-700/50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={prev}
            disabled={step === -1}
            className="btn-secondary !py-3 !px-4 disabled:opacity-20"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="btn-primary flex-1 !py-3 flex items-center justify-center gap-2 text-lg">
            {step === -1 ? (
              <><ChefHat className="w-5 h-5" /> C&apos;est parti!</>
            ) : step === totalSteps - 1 ? (
              <><Check className="w-5 h-5" /> Terminé!</>
            ) : (
              <>Étape suivante <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
