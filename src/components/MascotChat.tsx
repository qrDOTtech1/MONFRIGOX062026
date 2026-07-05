'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { LANG_TO_BCP47 } from '@/lib/units';
import Mascot, { MascotVariant } from './Mascot';
import { Send, Mic, MicOff, Trash2, Clock, Flame, Volume2, VolumeX, X, Check, Crown } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recipeIds?: string[];
  navTo?: string | null;
  actions?: ChatAction[];
  actionResults?: string[];
}

interface ChatAction {
  type: string;
  recipeId?: string;
  date?: string;
  mealType?: string;
  ingredientName?: string;
}

export interface RecipeMini {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  calories?: number | null;
  ingredients?: Array<{ ingredient: { emoji: string } }>;
}

const STORAGE_KEY = 'mf_chat_history';
const MAX_MESSAGES = 60;

const SUGGESTIONS = [
  'Que manger ce soir ?',
  'Recette rapide moins de 20min',
  'Montre-moi mon frigo',
  'Ajoute des oeufs au frigo',
];

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Salut ! 👋 Je suis ton assistant culinaire. Dis-moi ce dont tu as envie, demande-moi d\'ajouter des trucs au frigo ou au planning, ou lance une recette !',
  timestamp: 0,
};

function stripMarkdown(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

let _elConfigured: boolean | null = null;
let _currentMascotAudio: HTMLAudioElement | null = null;

async function speak(text: string, lang = 'fr') {
  if (typeof window === 'undefined') return;
  // Stop any playing audio
  if (_currentMascotAudio) { _currentMascotAudio.pause(); _currentMascotAudio = null; }
  window.speechSynthesis?.cancel();

  const clean = stripMarkdown(text)
    .replace(/[🍽️🇧🇫🇵🇹🔥⚡♻️💶👨‍🍳🏆💪🥦🌿⭐👑🔒✨😄😢🤔👋💬🆕📅⚠️🎉✅🛒]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!clean) return;

  // Check ElevenLabs once
  if (_elConfigured === null) {
    try {
      const res = await fetch('/api/tts');
      if (res.ok) {
        const data = await res.json();
        _elConfigured = data.configured === true;
      } else { _elConfigured = false; }
    } catch { _elConfigured = false; }
  }

  // Try ElevenLabs (voix ia — indépendant de la langue, ElevenLabs est multilingue)
  if (_elConfigured) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, lang, voice: 'ia' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        _currentMascotAudio = audio;
        audio.onended = () => { URL.revokeObjectURL(url); _currentMascotAudio = null; };
        audio.onerror = () => { URL.revokeObjectURL(url); _currentMascotAudio = null; };
        await audio.play();
        return;
      }
    } catch {}
  }

  // Fallback synthèse native — on choisit la voix qui correspond à la langue
  if (!window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(clean);
  const bcp47 = LANG_TO_BCP47[lang] ?? 'fr-FR';
  utt.lang = bcp47;
  utt.rate = 1.05;
  utt.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const matchVoice = voices.find(v => v.lang.startsWith(lang)) ?? voices.find(v => v.lang.startsWith('fr'));
  if (matchVoice) utt.voice = matchVoice;
  window.speechSynthesis.speak(utt);
}

/* ── Mini-card recette ── */
function RecipeCard({ recipe, onNavigate }: { recipe: RecipeMini; onNavigate: (id: string) => void }) {
  const emoji = recipe.ingredients?.[0]?.ingredient?.emoji || '🍽️';
  return (
    <button
      onClick={() => onNavigate(recipe.id)}
      aria-label={`Voir la recette ${recipe.name}, ${recipe.prepTime} minutes${recipe.calories ? `, ${recipe.calories} calories` : ''}`}
      className="shrink-0 flex flex-col rounded-2xl overflow-hidden transition-all active:scale-95 hover:opacity-90 text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      style={{ width: '118px', backgroundColor: 'rgba(6,6,10,0.92)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <div className="w-full h-[72px] flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
        {recipe.imageUrl
          ? <img src={recipe.imageUrl} alt="" aria-hidden className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <span className="text-3xl" aria-hidden>{emoji}</span>
        }
        <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.7)' }}>
          {recipe.cuisine}
        </span>
      </div>
      <div className="p-2 flex-1 flex flex-col gap-1">
        <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>
          {recipe.name}
        </p>
        <div className="flex items-center gap-2 mt-auto">
          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-2.5 h-2.5" aria-hidden />{recipe.prepTime}m
          </span>
          {recipe.calories && (
            <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
              <Flame className="w-2.5 h-2.5" aria-hidden />{recipe.calories}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Overlay écoute ── */
function ListeningOverlay({ transcript, onStop }: { transcript: string; onStop: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Mode écoute vocale actif"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}>
      <style>{`
        @keyframes sonar { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.8); opacity: 0; } }
        .sonar-ring { animation: sonar 1.6s ease-out infinite; }
        .sonar-ring-2 { animation: sonar 1.6s ease-out 0.5s infinite; }
      `}</style>
      <div className="relative flex items-center justify-center mb-8">
        <div className="sonar-ring absolute w-20 h-20 rounded-full" style={{ border: '2px solid var(--accent)', opacity: 0.6 }} />
        <div className="sonar-ring-2 absolute w-20 h-20 rounded-full" style={{ border: '2px solid var(--accent)', opacity: 0.6 }} />
        <button onClick={onStop} aria-label="Arrêter l'écoute"
          className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
          style={{ backgroundColor: 'var(--accent)' }}>
          <MicOff className="w-8 h-8" style={{ color: 'var(--accent-text)' }} aria-hidden />
        </button>
      </div>
      <p className="text-white text-xl font-bold mb-3" aria-live="polite">Je t'écoute…</p>
      {transcript && <p className="text-white/70 text-base text-center max-w-xs px-6" aria-live="polite">« {transcript} »</p>}
      <p className="text-white/40 text-sm mt-6">Appuie pour arrêter</p>
    </div>
  );
}

/* ── Composant principal ── */
export default function MascotChat({ allRecipes, embedded = false }: { allRecipes: RecipeMini[]; embedded?: boolean }) {
  const router = useRouter();
  const { lang } = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mascotState, setMascotState] = useState<MascotVariant>('wink');
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasSpeech, setHasSpeech] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [dynamicRecipes, setDynamicRecipes] = useState<RecipeMini[]>([]);
  const [coachMode, setCoachMode] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendRef = useRef<(text?: string) => void>(undefined);

  useEffect(() => {
    const hasSR = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setHasSpeech(hasSR);
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        setMessages(parsed.length > 0 ? parsed : [WELCOME]);
      } else {
        setMessages([WELCOME]);
      }
    } catch {
      setMessages([WELCOME]);
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); } catch {}
  }, [messages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (!pendingNav) return;
    const t = setTimeout(() => { router.push(pendingNav); setPendingNav(null); }, 1800);
    return () => clearTimeout(t);
  }, [pendingNav, router]);

  async function executeActions(actions: ChatAction[]): Promise<string[]> {
    const results: string[] = [];
    for (const action of actions) {
      if (action.type === 'COOK') {
        // Un seul mode cuisine dans l'app : la page dédiée (voix + IA intégrées).
        // On y redirige directement plutôt que de dupliquer l'UI ici.
        if (action.recipeId) {
          results.push('Mode cuisine lancé, on y va !');
          setPendingNav(`/recipes/${action.recipeId}/cook`);
        }
        continue;
      }
      try {
        const res = await fetch('/api/ai/chat-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        const data = await res.json();
        results.push(data.message || data.error || 'Action effectuée');
      } catch {
        results.push('Erreur lors de l\'action');
      }
    }
    return results;
  }

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setLoading(true);
    setMascotState('thinking');

    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })), coachMode, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      const reply = data.reply ?? 'Désolé, je n\'ai pas pu répondre.';
      const navTo: string | null = data.navTo ?? null;
      const actions: ChatAction[] = data.actions ?? [];
      const createdRecipes: string[] = data.createdRecipes ?? [];
      if (data.isVip !== undefined) setIsVip(data.isVip);

      // Fetch newly created recipe details for cards
      if (createdRecipes.length > 0) {
        for (const rid of createdRecipes) {
          try {
            const rRes = await fetch(`/api/recipes/${rid}`);
            if (rRes.ok) {
              const rData = await rRes.json();
              setDynamicRecipes(prev => [...prev, {
                id: rData.id, name: rData.name, difficulty: rData.difficulty,
                prepTime: rData.prepTime, cuisine: rData.cuisine,
                imageUrl: rData.imageUrl || '', calories: rData.calories,
                ingredients: rData.ingredients,
              }]);
            }
          } catch {}
        }
      }

      let actionResults: string[] = [];
      if (actions.length > 0) {
        setMascotState('excited');
        actionResults = await executeActions(actions);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        recipeIds: data.recipeIds ?? [],
        navTo,
        actions,
        actionResults,
      }]);

      const hasCook = actions.some(a => a.type === 'COOK');
      setMascotState(hasCook ? 'chef' : data.recipeIds?.length ? 'chef' : actions.length > 0 ? 'excited' : navTo ? 'excited' : 'happy');
      setTimeout(() => setMascotState('wink'), 3500);

      if (ttsEnabled) {
        let speakText = reply;
        if (actionResults.length > 0) speakText += '. ' + actionResults.join('. ');
        if (navTo) speakText += ` Je t'emmène maintenant.`;
        speak(speakText, lang);
      }

      if (navTo) setPendingNav(navTo);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Une erreur est survenue, réessaie !';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
      setMascotState('worried');
      if (ttsEnabled) speak(errMsg, lang);
      setTimeout(() => setMascotState('wink'), 4000);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, ttsEnabled, coachMode]);

  sendRef.current = send;

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;
    const recognition = new SR();
    recognition.lang = LANG_TO_BCP47[lang] ?? 'fr-FR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const interim = Array.from(e.results as SpeechRecognitionResultList)
        .map((r: SpeechRecognitionResult) => r[0].transcript).join('');
      setLiveTranscript(interim);
      if (e.results[e.results.length - 1].isFinal) {
        const finalText = e.results[e.results.length - 1][0].transcript;
        setLiveTranscript('');
        stopListening();
        setTimeout(() => sendRef.current?.(finalText), 100);
      }
    };
    recognition.onend = () => { setListening(false); setLiveTranscript(''); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); setLiveTranscript(''); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setMascotState('wink');
  }

  function stopListening() {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setListening(false);
    setLiveTranscript('');
  }

  function toggleListening() {
    if (listening) stopListening(); else startListening();
  }

  function clearHistory() {
    setMessages([{ ...WELCOME, content: 'C\'est reparti ! 😄 Dis-moi ce dont tu as envie.', timestamp: Date.now() }]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function getMascotForMessage(msg: ChatMessage): MascotVariant {
    if (msg.actions?.some(a => a.type === 'COOK')) return 'chef';
    if (msg.actions && msg.actions.length > 0) return 'excited';
    if (msg.recipeIds && msg.recipeIds.length > 0) return 'chef';
    if (msg.navTo) return 'excited';
    if (msg.content.includes('désolé') || msg.content.includes('erreur')) return 'worried';
    if (msg.content.includes('frigo est vide')) return 'sad';
    return 'happy';
  }

  const showSuggestions = messages.length <= 1 && !loading;
  const bubbleBg = 'rgba(8,8,12,0.88)';
  const inputBg = 'rgba(8,8,12,0.82)';
  const suggBg = 'rgba(18,18,26,0.85)';

  return (
    <>
      {listening && <ListeningOverlay transcript={liveTranscript} onStop={stopListening} />}

      <div className={embedded ? '' : 'card overflow-hidden'}>
        {!embedded && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <Mascot variant={mascotState} size="sm" animate={loading ? 'bounce' : 'float'} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold leading-tight" id="chat-title">Assistant culinaire</h2>
              <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                {loading ? '🤔 Réfléchit…' : `${allRecipes.length} recettes dispo`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {isVip && (
                <button onClick={() => setCoachMode(v => !v)}
                  aria-label={coachMode ? 'Désactiver le mode coach' : 'Activer le mode coach'}
                  className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    backgroundColor: coachMode ? 'rgba(234,179,8,0.2)' : 'transparent',
                    color: coachMode ? '#eab308' : 'var(--text-muted)',
                    border: coachMode ? '1px solid rgba(234,179,8,0.3)' : '1px solid transparent',
                  }}>
                  <Crown className="w-3 h-3" /> Coach
                </button>
              )}
              <button onClick={() => setTtsEnabled(v => !v)}
                aria-label={ttsEnabled ? 'Désactiver la voix' : 'Activer la voix'}
                className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                style={{ color: ttsEnabled ? 'var(--accent)' : 'var(--text-muted)' }}>
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button onClick={clearHistory} aria-label="Effacer l'historique"
                className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {embedded && (
          <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }} aria-live="polite">
              {loading ? '🤔 Réfléchit…' : coachMode ? '🏋️ Mode Coach' : '💬 Assistant culinaire'}
            </p>
            <div className="flex items-center gap-1">
              {isVip && (
                <button onClick={() => setCoachMode(v => !v)}
                  aria-label={coachMode ? 'Désactiver le mode coach' : 'Activer le mode coach'}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-bold transition-all"
                  style={{
                    backgroundColor: coachMode ? 'rgba(234,179,8,0.2)' : 'transparent',
                    color: coachMode ? '#eab308' : 'var(--text-muted)',
                    border: coachMode ? '1px solid rgba(234,179,8,0.3)' : '1px solid transparent',
                  }}>
                  <Crown className="w-2.5 h-2.5" /> Coach
                </button>
              )}
              <button onClick={() => setTtsEnabled(v => !v)}
                aria-label={ttsEnabled ? 'Désactiver la voix' : 'Activer la voix'}
                className="p-1 rounded-lg hover:opacity-70"
                style={{ color: ttsEnabled ? 'var(--accent)' : 'var(--text-muted)' }}>
                {ttsEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>
              <button onClick={clearHistory} aria-label="Effacer l'historique"
                className="p-1 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Zone messages */}
        <div role="log" aria-label="Conversation avec l'assistant" aria-live="polite"
          className="h-72 overflow-y-auto px-3 py-2 space-y-3">
          {messages.map((msg, i) => {
            const allAvailable = [...allRecipes, ...dynamicRecipes];
            const cards = (msg.recipeIds ?? []).map(id => allAvailable.find(r => r.id === id)).filter(Boolean) as RecipeMini[];
            const mascotVariant = msg.role === 'assistant' ? getMascotForMessage(msg) : null;

            return (
              <div key={i} className="space-y-1.5">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {/* Mascot avatar for assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 mt-1">
                      <Mascot variant={mascotVariant!} size="sm" animate="none" />
                    </div>
                  )}
                  <div className={`max-w-[78%] px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user' ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'
                  }`}
                    style={msg.role === 'user'
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                      : { backgroundColor: bubbleBg, color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {stripMarkdown(msg.content)}

                    {/* Action confirmations */}
                    {msg.actionResults && msg.actionResults.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.actionResults.map((r, j) => (
                          <div key={j} className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg"
                            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                            <Check className="w-3 h-3 shrink-0" /> {r}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.navTo && (
                      <button onClick={() => router.push(msg.navTo!)}
                        className="flex items-center gap-1.5 mt-2 w-full px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                        aria-label={`Ouvrir ${msg.navTo}`}>
                        <span>→ Ouvrir</span>
                        <span className="opacity-80">{msg.navTo}</span>
                      </button>
                    )}
                  </div>
                </div>
                {cards.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 ml-10" style={{ scrollbarWidth: 'none' }}
                    role="list" aria-label={`${cards.length} recette${cards.length > 1 ? 's' : ''} suggérée${cards.length > 1 ? 's' : ''}`}>
                    {cards.map(recipe => (
                      <div key={recipe.id} role="listitem">
                        <RecipeCard recipe={recipe} onNavigate={(id) => router.push(`/recipes/${id}`)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start gap-2" role="status" aria-label="L'assistant réfléchit">
              <div className="shrink-0 mt-1"><Mascot variant="thinking" size="sm" animate="bounce" /></div>
              <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
                style={{ backgroundColor: bubbleBg, border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="flex items-center gap-1" aria-hidden>
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: 'var(--text-muted)', animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} aria-hidden />
        </div>

        {showSuggestions && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5" role="group" aria-label="Suggestions rapides">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-[10px] px-2.5 py-1 rounded-full transition-all active:scale-95"
                style={{ backgroundColor: suggBg, border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Barre input + micro */}
        <div className="flex items-center gap-2.5 px-3 pb-3 pt-1">
          {hasSpeech && (
            <button onClick={toggleListening}
              aria-label={listening ? 'Arrêter le micro' : 'Parler à l\'assistant'}
              aria-pressed={listening}
              className="relative flex items-center justify-center rounded-2xl shrink-0 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                width: '48px', height: '44px',
                backgroundColor: listening ? 'var(--accent)' : 'rgba(var(--accent-rgb, 99,102,241),0.18)',
                border: `2px solid ${listening ? 'var(--accent)' : 'rgba(var(--accent-rgb, 99,102,241),0.45)'}`,
                color: listening ? 'var(--accent-text)' : 'var(--accent)',
              }}>
              {listening ? <MicOff className="w-5 h-5" aria-hidden /> : <Mic className="w-5 h-5" aria-hidden />}
              {listening && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: '#22c55e', border: '1.5px solid var(--bg)' }} aria-hidden />
              )}
            </button>
          )}
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={hasSpeech ? 'Ou écris ta question…' : 'Demande-moi quelque chose…'}
            aria-label="Message pour l'assistant culinaire"
            className="flex-1 text-xs px-3 py-2.5 rounded-xl outline-none"
            style={{ backgroundColor: inputBg, border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)' }} />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            aria-label="Envoyer le message"
            className="p-2.5 rounded-xl shrink-0 transition-all active:scale-95 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
