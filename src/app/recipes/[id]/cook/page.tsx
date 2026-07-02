'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChefHat, Clock, X, Timer, Check, Users, Camera, Refrigerator, Loader2, Globe, Lock, Mic, MicOff, Volume2, HelpCircle } from 'lucide-react';
import { useVoiceCooking } from '@/lib/useVoiceCooking';
import Mascot, { MascotVariant } from '@/components/Mascot';

const ENCOURAGEMENTS = [
  '🌟 Tu t\'en sors bien !',
  '👨‍🍳 Parfait ! Comme un pro !',
  '🔥 C\'est beau ce que tu fais !',
  '💪 Continue comme ça !',
  '✨ Magnifique !',
  '🎯 Tu maîtrises !',
  '🚀 C\'est l\'élan !',
  '😋 Ça va être délicieux !',
  '⚡ Vitesse et précision !',
  '🎉 Tu es formidable !',
];

function getStepAdviceAndAnecdote(stepText: string): { advice: string; anecdote: string } {
  const text = (stepText || '').toLowerCase();
  if (text.includes('découper') || text.includes('couper') || text.includes('émincer')) {
    return { advice: '🔪 Couteau bien aiguisé = meilleur résultat + plus sûr', anecdote: '💡 Les chefs pros affûtent leurs couteaux tous les jours !' };
  }
  if (text.includes('chauffer') || text.includes('préchauffer') || text.includes('four')) {
    return { advice: '🔥 Le préchauffage est CRUCIAL pour une cuisson uniforme', anecdote: '🌡️ Un four vraiment chaud à 180°C dore mieux qu\'un four froid à 200°C !' };
  }
  if (text.includes('mélang') || text.includes('fouett') || text.includes('remue')) {
    return { advice: '🌀 Mélange lentement pour éviter d\'incorporer trop d\'air', anecdote: '🎂 Trop de mélange = perte de moelleux (sauf pour les blancs en neige !)' };
  }
  if (text.includes('mijot') || text.includes('cuisson lent')) {
    return { advice: '⏱️ Feu doux = meilleure fusion des saveurs', anecdote: '😋 Un bon mijoté, c\'est le temps qui fait le travail' };
  }
  if (text.includes('repos') || text.includes('attendre') || text.includes('laisser')) {
    return { advice: '⏸️ Ne force pas ! Les bonnes choses prennent du temps', anecdote: '🎭 La patience, la plus grande vertu du cuisinier' };
  }
  if (text.includes('sel') || text.includes('assaisonn')) {
    return { advice: '🧂 Assaisonne progressivement, tu peux toujours ajouter, jamais retirer', anecdote: '👃 Le sel, c\'est le volume des saveurs' };
  }
  if (text.includes('huile') || text.includes('beurre')) {
    return { advice: '🫒 Huile ou beurre chauds = meilleur goût et texture', anecdote: '🍳 La réaction de Maillard crée les vraies saveurs' };
  }
  if (text.includes('verser') || text.includes('ajouter') || text.includes('incorpor')) {
    return { advice: '💧 Ajoute lentement pour garder une texture homogène', anecdote: '🎨 Chaque geste compte, comme en peinture' };
  }
  if (text.includes('goût') || text.includes('gout')) {
    return { advice: '👅 Goûte ! Tes papilles sont ton meilleur guide', anecdote: '🤓 Les chefs goûtent en continu, c\'est leur contrôle qualité' };
  }
  if (text.includes('dor') || text.includes('couleur') || text.includes('brun')) {
    return { advice: '🎨 La couleur, c\'est un indicateur de saveur. Dore bien !', anecdote: '✨ Le dorage prouve que la réaction de Maillard fait son effet' };
  }
  const defaults = [
    { advice: '📖 Lis bien l\'étape avant de commencer', anecdote: '⚡ 2 secondes de lecture, zéro surprise' },
    { advice: '🧊 Prépare tes ingrédients près de toi', anecdote: '👨‍🍳 C\'est la mise en place des vrais cuisiniers' },
    { advice: '⏱️ Gère ton timing, pas de précipitation', anecdote: '🎯 Les meilleures recettes ne se pressent pas' },
    { advice: '👃 Les arômes sont en route !', anecdote: '😋 Ça sent déjà bon, non ?' },
    { advice: '🏆 Tu es presque champion !', anecdote: '🎉 Quelques minutes et c\'est fini' },
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

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

  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCards, setAiCards] = useState<Array<{ title: string; description: string }>>([]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  function closeAiCards() {
    setAiAnswer('');
    setAiCards([]);
    setSelectedCard(null);
  }

  function handleSelectOption(idx: number) {
    if (idx >= 0 && idx < aiCards.length) {
      setSelectedCard(idx);
      const card = aiCards[idx];
      speak(`Option ${idx + 1} sélectionnée : ${card.title}. ${card.description}`);
      // La liste se referme après la sélection, comme lors d'un changement d'étape
      setTimeout(() => closeAiCards(), 3500);
    }
  }

  // Referme les cartes IA quand on change d'étape pour ne pas garder d'anciennes suggestions à l'écran
  useEffect(() => { closeAiCards(); }, [step]);

  function handleTimerStart() {
    if (timer && timerSeconds > 0) setTimerRunning(true);
  }
  function handleTimerStop() { setTimerRunning(false); }
  function handleTimerReset() {
    if (timer) { setTimerSeconds(timer * 60); setTimerRunning(false); }
  }

  const { isListening, isSpeaking, lastCommand, supported, startListening, stopListening, speak, ttsEngine, sttEngine } = useVoiceCooking({
    onNext: next,
    onPrev: prev,
    onRepeat: () => {},
    onConfirm: () => {
      setWaitingForConfirm(false);
      next();
    },
    // Fallback IA — pilote l'interface via des actions structurées, jamais du texte libre
    onAskAI: async (question: string) => {
      setAiLoading(true);
      setAiAnswer('');
      setAiCards([]);
      setSelectedCard(null);
      try {
        const allIngredientsContext = recipe ? recipe.ingredients.map(ing => `${ing.quantity} ${ing.unit} ${ing.ingredient.name}`).join(', ') : '';
        const res = await fetch('/api/ai/cook-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: question,
            recipeName: recipe?.name || '',
            stepIndex: step,
            totalSteps,
            stepText: steps[step] || '',
            allSteps: steps,
            ingredientsText: allIngredientsContext,
            waitingForConfirm,
          }),
        });
        const data = await res.json();

        if (data.type === 'action') {
          if (data.voiceReply) speak(data.voiceReply);
          switch (data.action) {
            case 'next': next(); break;
            case 'prev': prev(); break;
            case 'repeat_current': if (!data.voiceReply) speak(currentStepText); break;
            case 'repeat_step': {
              const n = data.stepNumber;
              if (typeof n === 'number' && steps[n - 1] && !data.voiceReply) speak(`Étape ${n}. ${steps[n - 1]}`);
              break;
            }
            case 'confirm': setWaitingForConfirm(false); next(); break;
            case 'timer_start': handleTimerStart(); break;
            case 'timer_stop': handleTimerStop(); break;
            case 'timer_reset': handleTimerReset(); break;
            case 'finish': setDone(true); break;
            case 'show_ingredients': if (!data.voiceReply) speak(ingredientsText); break;
            case 'show_progress': if (!data.voiceReply) speak(`Tu es à l'étape ${step + 1} sur ${totalSteps}.`); break;
            default: break; // ignore
          }
        } else if (data.type === 'cards' && Array.isArray(data.cards) && data.cards.length > 0) {
          const intro = data.intro || 'Voici mes suggestions :';
          setAiAnswer(intro);
          setAiCards(data.cards);
          const voiceText = `${intro} ${data.cards.map((c: { title: string }, i: number) => `Option ${i + 1} : ${c.title}`).join('. ')}. Dis "option 1" ou "option 2" pour choisir.`;
          speak(voiceText);
        }
      } catch {
        speak('Désolé, l\'IA n\'est pas disponible.');
      }
      setAiLoading(false);
    },
    onRepeatStep: (stepIndex: number) => {
      if (steps[stepIndex]) {
        speak(`Étape ${stepIndex + 1}. ${steps[stepIndex]}`);
      }
    },
    onSelectOption: handleSelectOption,
    onHelp: () => setShowHelp(true),
    onTimerStart: () => {
      if (timer && timerSeconds > 0) setTimerRunning(true);
    },
    onTimerStop: () => setTimerRunning(false),
    onTimerReset: () => {
      if (timer) { setTimerSeconds(timer * 60); setTimerRunning(false); }
    },
    onFinish: () => setDone(true),
    currentStepText,
    currentStep: step,
    totalSteps,
    ingredientsText,
    waitingForConfirm,
    allStepsTexts: steps,
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

  const mascotVariant: MascotVariant = step <= 0 ? 'excited' : step === totalSteps - 1 ? 'love' : 'chef';
  const encouragement = useMemo(
    () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
    [step],
  );
  const stepAdvice = useMemo(() => getStepAdviceAndAnecdote(steps[step] || ''), [step, steps]);

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
          {/* Bouton aide commandes vocales */}
          {supported && (
            <button
              onClick={() => setShowHelp(true)}
              title="Commandes vocales"
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{ border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
              <span className="text-xs font-bold">?</span>
            </button>
          )}
        </div>
      </header>

      {/* Overlay aide — grille complète des commandes vocales */}
      {showHelp && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-4 fade-in"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowHelp(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold">Commandes vocales</h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="p-1 rounded-lg hover:bg-[var(--bg-inset)]">
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '⏭', label: 'Suivant', ex: '"suivant"' },
                { icon: '⏮', label: 'Précédent', ex: '"précédent"' },
                { icon: '🔁', label: 'Répète', ex: '"répète"' },
                { icon: '🔁', label: 'Répète étape N', ex: '"répète étape 3"' },
                { icon: '✅', label: 'Confirmer', ex: '"confirmer"' },
                { icon: '🥕', label: 'Ingrédients', ex: '"ingrédients"' },
                { icon: '📊', label: 'Progression', ex: '"où j\'en suis"' },
                { icon: '⏱', label: 'Minuteur', ex: '"minuteur"' },
                { icon: '🏁', label: 'Terminé', ex: '"terminé"' },
                { icon: '🔇', label: 'Silence', ex: '"stop"' },
                { icon: '👆', label: 'Choisir option', ex: '"option 1"' },
                { icon: '🤖', label: 'Question IA', ex: '"cheffe, …"' },
              ].map((c, i) => (
                <div key={i} className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-xs font-medium">{c.label}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.ex}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-center mt-4" style={{ color: 'var(--text-muted)' }}>
              Dis &quot;cheffe&quot; suivi de ta question pour parler à l&apos;assistant IA.
            </p>
          </div>
        </div>
      )}

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
            {ttsEngine === 'elevenlabs' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded ml-1 text-emerald-600 dark:text-emerald-400" style={{ backgroundColor: 'rgba(22,163,74,0.1)' }}>EL</span>
            )}
          </div>
          {lastCommand && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {lastCommand}
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
            <div className="flex flex-col items-center text-center mb-6">
              <Mascot variant={mascotVariant} size="md" animate="float" />
              <p className="text-base font-bold mt-2" style={{ color: 'var(--accent)' }}>{encouragement}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Étape {step + 1} sur {totalSteps}</p>
            </div>

            <p className="text-lg leading-relaxed font-light mb-6 text-center">
              {steps[step]}
            </p>

            <div className="space-y-2.5 mb-2">
              <div className="rounded-xl px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(34,211,238,0.08))', border: '1px solid rgba(59,130,246,0.2)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{stepAdvice.advice}</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.08))', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stepAdvice.anecdote}</p>
              </div>
            </div>

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

            {/* AI Answer zone */}
            {(aiLoading || aiAnswer) && (
              <div className="card p-4 mb-6 fade-in" style={{ border: '1px solid rgba(59,130,246,0.2)', backgroundColor: 'rgba(59,130,246,0.04)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🤖</span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Assistant IA</span>
                  {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-auto" />}
                </div>
                {aiAnswer && (
                  <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{aiAnswer}</p>
                )}
                {aiCards.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {aiCards.map((card, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(i)}
                        className="w-full text-left rounded-xl p-3 transition-all"
                        style={{
                          backgroundColor: selectedCard === i ? 'rgba(59,130,246,0.12)' : 'var(--bg-raised)',
                          border: `1px solid ${selectedCard === i ? 'rgba(59,130,246,0.4)' : 'var(--border-subtle)'}`,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-blue-500 mt-0.5 shrink-0">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium" style={{ color: selectedCard === i ? '#3b82f6' : 'var(--text)' }}>{card.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.description}</p>
                          </div>
                        </div>
                        {selectedCard === i && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-500 font-medium">
                            <Check className="w-3 h-3" /> Sélectionné
                          </div>
                        )}
                      </button>
                    ))}
                    {isListening && (
                      <p className="text-[10px] text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                        Dis &quot;option 1&quot; ou &quot;option 2&quot; pour choisir
                      </p>
                    )}
                  </div>
                )}
                {aiAnswer && !aiLoading && (
                  <button onClick={() => { setAiAnswer(''); setAiCards([]); setSelectedCard(null); }} className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>Fermer</button>
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
