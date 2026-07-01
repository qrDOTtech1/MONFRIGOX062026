'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChefHat, Clock, X, Timer, Check, Users, Camera, Refrigerator, Loader2, Globe, Lock, Mic, MicOff } from 'lucide-react';
import { useVoiceCooking } from '@/lib/useVoiceCooking';

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

function parseSteps(raw: string): string[] {
  if (!raw) return [];
  let text = raw.trim();

  let parts = text.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return cleanSteps(parts);

  parts = text
    .split(/(?=(?:\d+[\.\)]\s)|(?:étape\s*\d+\s*[:.\-]?\s))/i)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return cleanSteps(parts);

  parts = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖÀ-Ý])/)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return cleanSteps(parts);

  return [text];
}

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
  const [deducting, setDeducting] = useState(false);
  const [deducted, setDeducted] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [sharePublic, setSharePublic] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [showPublicWarning, setShowPublicWarning] = useState(false);
  const [userName, setUserName] = useState('');
  const [waitingForConfirm, setWaitingForConfirm] = useState(false);

  const totalSteps = steps.length;

  function next() {
    setStep(prev => {
      if (prev < totalSteps - 1) {
        detectTimer(steps[prev + 1]);
        return prev + 1;
      } else {
        setDone(true);
        return prev;
      }
    });
  }

  function prev() {
    setStep(prev => prev > -1 ? prev - 1 : prev);
  }

  // ── Voice Cooking ───────────────────────────────────────────────────
  const ingredientsText = recipe
    ? `Il te faut ${recipe.ingredients.length} ingrédients. ${recipe.ingredients.map(ing => `${ing.quantity} ${ing.unit} de ${ing.ingredient.name}`).join('. ')}.`
    : '';

  const currentStepText = step >= 0 && steps[step]
    ? `Étape ${step + 1} sur ${totalSteps}. ${steps[step]}`
    : step === -1 ? `Prépare tes ingrédients. ${ingredientsText} Dis "confirmer" quand tu es prêt.` : '';

  const { isListening, isSpeaking, lastCommand, supported, startListening, stopListening } = useVoiceCooking({
    onNext: next,
    onPrev: prev,
    onRepeat: () => {},
    onConfirm: () => {
      setWaitingForConfirm(false);
      next();
    },
    currentStepText,
    ingredientsText,
    waitingForConfirm,
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.name) setUserName(data.name.split(' ')[0]); })
      .catch(() => {});
  }, []);

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
    if (!done || !recipe) return;
    fetch('/api/cook-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id, servings: recipe.servings }),
    }).catch(() => {});
    // Arrêter le micro quand c'est terminé
    stopListening();
  }, [done, recipe, stopListening]);

  async function compressImage(file: File): Promise<string> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        const max = 600;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function shareToComm() {
    if (!recipe) return;
    setSharing(true);
    await fetch(`/api/recipes/${recipe.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: shareNote, photoUrl: resultPhoto ?? '', isPublic: sharePublic }),
    });
    setSharing(false);
    setShared(true);
  }

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

  const progress = step === -1 ? 0 : ((step + 1) / totalSteps) * 100;

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
  }, [step, totalSteps]); // eslint-disable-line react-hooks/exhaustive-deps

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

          {!shared ? (
            <div className="w-full mb-5">
              <div className="rounded-xl p-4 mb-4 text-left"
                style={{ background: 'linear-gradient(135deg,#f59e0b15,#ec489915)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-sm font-semibold mb-0.5">✨ Partagez votre création à notre communauté !</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Inspirez les autres cuisiniers avec votre photo et votre avis</p>
              </div>

              {resultPhoto ? (
                <div className="mb-3">
                  <img src={resultPhoto} alt="Ton plat" className="w-full rounded-xl mb-2 aspect-video object-cover" style={{ border: '1px solid var(--border)' }} />
                  <button onClick={() => setResultPhoto(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Changer la photo</button>
                </div>
              ) : (
                <label className="card flex items-center gap-3 px-4 py-3.5 mb-3 cursor-pointer hover:bg-[var(--bg-inset)] transition-colors">
                  <Camera className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="text-left">
                    <p className="text-sm font-medium">Ajouter une photo</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Immortalise ton plat 📸</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) setResultPhoto(await compressImage(file));
                    }} />
                </label>
              )}

              <textarea
                placeholder="Ajoute une note… astuces, variantes, ce que tu as modifié ✍️"
                value={shareNote}
                onChange={e => setShareNote(e.target.value)}
                rows={2}
                className="input-field mb-3 resize-none text-sm"
              />

              <button onClick={() => {
                  if (!sharePublic) setShowPublicWarning(true);
                  setSharePublic(p => !p);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3 transition-all text-left"
                style={{ backgroundColor: sharePublic ? 'rgba(59,130,246,0.08)' : 'var(--bg-inset)', border: `1px solid ${sharePublic ? 'rgba(59,130,246,0.25)' : 'var(--border-subtle)'}` }}>
                {sharePublic ? <Globe className="w-4 h-4 text-blue-500" /> : <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{sharePublic ? 'Visible par la communauté' : 'Note privée'}</p>
                  {sharePublic && <p className="text-[10px] text-blue-500">Ta photo et ta note seront publiques</p>}
                </div>
                <div className="w-10 rounded-full transition-all"
                  style={{ height: '22px', backgroundColor: sharePublic ? '#3b82f6' : 'var(--border)', display: 'flex', alignItems: 'center', padding: '2px' }}>
                  <div className="w-4 h-4 rounded-full bg-white shadow transition-all"
                    style={{ transform: sharePublic ? 'translateX(18px)' : 'translateX(0)' }} />
                </div>
              </button>

              {showPublicWarning && sharePublic && (
                <div className="rounded-lg px-3 py-2.5 mb-3 fade-in"
                  style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    📢 Ta note et ta photo seront visibles par tous les utilisateurs de MonFrigo. Tu pourras les rendre privées depuis la fiche de la recette.
                  </p>
                </div>
              )}

              <button onClick={shareToComm} disabled={sharing || (!shareNote.trim() && !resultPhoto)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 mb-2"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {sharing ? 'Publication…' : 'Partager ma création'}
              </button>
              <button onClick={() => setShared(true)} className="w-full text-xs py-1.5" style={{ color: 'var(--text-muted)' }}>
                Passer sans partager
              </button>
            </div>
          ) : (
            shared && (shareNote || resultPhoto) ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl mb-5 text-sm font-medium fade-in"
                style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                <Check className="w-4 h-4" /> Partagé avec la communauté !
              </div>
            ) : null
          )}

          {!deducted ? (
            <button
              onClick={async () => {
                setDeducting(true);
                await fetch('/api/fridge/deduct', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ recipeId: recipe.id, servings: recipe.servings, baseServings: recipe.servings }),
                });
                setDeducting(false);
                setDeducted(true);
              }}
              disabled={deducting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium mb-4 transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {deducting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Mise à jour du frigo…</>
                : <><Refrigerator className="w-4 h-4" /> Retirer les ingrédients du frigo</>
              }
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium mb-4 text-emerald-600 dark:text-emerald-400"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Check className="w-4 h-4" /> Frigo mis à jour !
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <button onClick={() => router.push('/fridge')} className="btn-secondary">Mon frigo</button>
            <button onClick={() => { setStep(-1); setDone(false); setResultPhoto(null); setDeducted(false); }} className="btn-primary">Refaire</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()} className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
          <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <div className="text-center flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mode cuisine</p>
          <p className="text-sm font-medium truncate px-4">{recipe.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3.5 h-3.5" />
            {recipe.prepTime}min
          </div>
          {/* Bouton micro */}
          {supported && (
            <button
              onClick={isListening ? stopListening : () => {
                setWaitingForConfirm(true);
                const greeting = `Bonjour ${userName || 'chef'} ! Aujourd'hui on va préparer : ${recipe.name}. ${ingredientsText} Dis "confirmer" quand tu es prêt pour commencer.`;
                startListening(greeting);
              }}
              title={isListening ? 'Couper le micro' : 'Activer les commandes vocales'}
              className="p-2 rounded-lg transition-all"
              style={{
                backgroundColor: isListening ? 'rgba(22,163,74,0.12)' : 'var(--bg-inset)',
                border: isListening ? '1px solid rgba(22,163,74,0.3)' : '1px solid var(--border-subtle)',
              }}>
              {isListening
                ? <Mic className="w-4 h-4 text-emerald-500" style={{ animation: 'pulse 1.5s infinite' }} />
                : <MicOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
            </button>
          )}
        </div>
      </header>

      {/* Barre de progression */}
      <div className="h-0.5" style={{ backgroundColor: 'var(--bg-inset)' }}>
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
      </div>

      {/* Bandeau vocal actif */}
      {isListening && (
        <div className="flex items-center justify-between px-4 py-2 fade-in"
          style={{ backgroundColor: 'rgba(22,163,74,0.07)', borderBottom: '1px solid rgba(22,163,74,0.15)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ animation: 'pulse 1s infinite' }} />
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {isSpeaking ? 'Je parle…' : waitingForConfirm ? 'Dis "confirmer" pour commencer' : 'J\'écoute… dis "suivant", "précédent" ou "répète"'}
            </span>
          </div>
          {lastCommand && (
            <span className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
              « {lastCommand} »
            </span>
          )}
        </div>
      )}

      {/* Contenu */}
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

            {/* Hint vocal sur l'écran d'ingrédients */}
            {supported && !isListening && (
              <button onClick={() => {
                  setWaitingForConfirm(true);
                  const greeting = `Bonjour ${userName || 'chef'} ! Aujourd'hui on va préparer : ${recipe.name}. ${ingredientsText} Dis "confirmer" quand tu es prêt pour commencer.`;
                  startListening(greeting);
                }}
                className="w-full flex items-center justify-center gap-2 mt-6 py-2.5 rounded-xl text-sm transition-all"
                style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px dashed rgba(22,163,74,0.3)', color: 'rgb(22,163,74)' }}>
                <Mic className="w-4 h-4" />
                Activer les commandes vocales (mains libres)
              </button>
            )}
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

      {/* Navigation */}
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
