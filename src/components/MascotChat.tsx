'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Mascot, { MascotVariant } from './Mascot';
import { Send, Mic, MicOff, Trash2, Clock, Flame, Volume2, VolumeX } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recipeIds?: string[];
  navTo?: string | null;
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
  'Plan repas de la semaine',
];

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Salut ! 👋 Je suis ton assistant culinaire. Dis-moi ce dont tu as envie, ou demande-moi d\'ouvrir une section de l\'app !',
  timestamp: 0,
};

/* ── Nettoyage markdown pour TTS et affichage ──────────────── */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')   // *bold* **bold** ***bold***
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')       // _italic_ __bold__
    .replace(/~~([^~]+)~~/g, '$1')                // ~~strikethrough~~
    .replace(/`([^`]+)`/g, '$1')                  // `code`
    .replace(/^#{1,6}\s+/gm, '')                  // # headings
    .replace(/^[-*+]\s+/gm, '• ')                 // - list items → bullet
    .replace(/^\d+\.\s+/gm, '')                   // 1. numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')      // [link](url) → link text
    .replace(/\n{3,}/g, '\n\n')                   // collapse extra newlines
    .trim();
}

/* ── TTS helper ────────────────────────────────────────────── */
function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = stripMarkdown(text)
    .replace(/[🍽️🇧🇫🇵🇹🔥⚡♻️💶👨‍🍳🏆💪🥦🌿⭐👑🔒✨😄😢🤔👋💬🆕📅⚠️]/gu, '') // emojis bruyants en TTS
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!clean) return;
  const utt = new SpeechSynthesisUtterance(clean);
  utt.lang = 'fr-FR';
  utt.rate = 1.05;
  utt.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const frVoice = voices.find(v => v.lang.startsWith('fr'));
  if (frVoice) utt.voice = frVoice;
  window.speechSynthesis.speak(utt);
}

/* ── Mini-card recette ─────────────────────────────────────── */
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

/* ── Overlay écoute ────────────────────────────────────────── */
function ListeningOverlay({ transcript, onStop }: { transcript: string; onStop: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mode écoute vocale actif"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        @keyframes sonar {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .sonar-ring { animation: sonar 1.6s ease-out infinite; }
        .sonar-ring-2 { animation: sonar 1.6s ease-out 0.5s infinite; }
      `}</style>

      {/* Cercles sonar */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="sonar-ring absolute w-20 h-20 rounded-full"
          style={{ border: '2px solid var(--accent)', opacity: 0.6 }} />
        <div className="sonar-ring-2 absolute w-20 h-20 rounded-full"
          style={{ border: '2px solid var(--accent)', opacity: 0.6 }} />

        {/* Bouton central */}
        <button
          onClick={onStop}
          aria-label="Arrêter l'écoute"
          className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <MicOff className="w-8 h-8" style={{ color: 'var(--accent-text)' }} aria-hidden />
        </button>
      </div>

      <p className="text-white text-xl font-bold mb-3" aria-live="polite">
        Je t'écoute…
      </p>

      {transcript && (
        <p className="text-white/70 text-base text-center max-w-xs px-6" aria-live="polite">
          « {transcript} »
        </p>
      )}

      <p className="text-white/40 text-sm mt-6">
        Appuie pour arrêter
      </p>
    </div>
  );
}

/* ── Composant principal ───────────────────────────────────── */
export default function MascotChat({ allRecipes, embedded = false }: { allRecipes: RecipeMini[]; embedded?: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mascotState, setMascotState] = useState<MascotVariant>('wink');
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [hasSpeech, setHasSpeech] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendRef = useRef<(text?: string) => void>(undefined);

  useEffect(() => {
    const hasSR = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setHasSpeech(hasSR);
    // Précharger les voix TTS
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Navigation automatique après confirmation vocale
  useEffect(() => {
    if (!pendingNav) return;
    const t = setTimeout(() => {
      router.push(pendingNav);
      setPendingNav(null);
    }, 1800); // délai pour que l'utilisateur entende la réponse TTS
    return () => clearTimeout(t);
  }, [pendingNav, router]);

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
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      const reply = data.reply ?? 'Désolé, je n\'ai pas pu répondre.';
      const navTo: string | null = data.navTo ?? null;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        recipeIds: data.recipeIds ?? [],
        navTo,
      }]);

      setMascotState(data.recipeIds?.length ? 'chef' : navTo ? 'excited' : 'happy');
      setTimeout(() => setMascotState('wink'), 3500);

      // Lecture TTS
      if (ttsEnabled) {
        const speakText = navTo
          ? reply + ` Je t'emmène maintenant.`
          : reply;
        speak(speakText);
      }

      // Navigation automatique si commande détectée
      if (navTo) setPendingNav(navTo);

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Une erreur est survenue, réessaie !';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
      setMascotState('worried');
      if (ttsEnabled) speak(errMsg);
      setTimeout(() => setMascotState('wink'), 4000);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, ttsEnabled]);

  sendRef.current = send;

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;
    const recognition = new SR();
    recognition.lang = 'fr-FR';
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
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setLiveTranscript('');
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  function clearHistory() {
    setMessages([{ ...WELCOME, content: 'C\'est reparti ! 😄 Dis-moi ce dont tu as envie.', timestamp: Date.now() }]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const showSuggestions = messages.length <= 1 && !loading;
  const bubbleBg = 'rgba(8,8,12,0.88)';
  const inputBg  = 'rgba(8,8,12,0.82)';
  const suggBg   = 'rgba(18,18,26,0.85)';

  return (
    <>
      {/* Overlay plein écran pendant l'écoute */}
      {listening && (
        <ListeningOverlay transcript={liveTranscript} onStop={stopListening} />
      )}

      <div className={embedded ? '' : 'card overflow-hidden'}>

        {/* Header standalone */}
        {!embedded && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-2.5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <Mascot variant={mascotState} size="sm" animate={loading ? 'bounce' : 'float'} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold leading-tight" id="chat-title">Assistant culinaire</h2>
              <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                {loading ? '🤔 Réfléchit…' : `${allRecipes.length} recettes dispo`}
              </p>
            </div>
            <div className="flex items-center gap-1">
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

        {/* Séparateur embedded */}
        {embedded && (
          <div className="flex items-center justify-between px-4 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }} aria-live="polite">
              {loading ? '🤔 Réfléchit…' : '💬 Assistant culinaire'}
            </p>
            <div className="flex items-center gap-1">
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
        <div
          role="log"
          aria-label="Conversation avec l'assistant"
          aria-live="polite"
          className="h-48 overflow-y-auto px-3 py-2 space-y-3"
        >
          {messages.map((msg, i) => {
            const cards = (msg.recipeIds ?? [])
              .map(id => allRecipes.find(r => r.id === id))
              .filter(Boolean) as RecipeMini[];

            return (
              <div key={i} className="space-y-1.5">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user' ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'
                    }`}
                    style={msg.role === 'user'
                      ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                      : { backgroundColor: bubbleBg, color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {stripMarkdown(msg.content)}
                    {/* Bandeau navigation */}
                    {msg.navTo && (
                      <button
                        onClick={() => router.push(msg.navTo!)}
                        className="flex items-center gap-1.5 mt-2 w-full px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                        aria-label={`Ouvrir ${msg.navTo}`}
                      >
                        <span>→ Ouvrir</span>
                        <span className="opacity-80">{msg.navTo}</span>
                      </button>
                    )}
                  </div>
                </div>
                {cards.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}
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
            <div className="flex justify-start" role="status" aria-label="L'assistant réfléchit">
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

        {/* Suggestions */}
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
          {/* Micro — bouton principal, bien visible */}
          {hasSpeech && (
            <button
              onClick={toggleListening}
              aria-label={listening ? 'Arrêter le micro' : 'Parler à l\'assistant'}
              aria-pressed={listening}
              className="relative flex items-center justify-center rounded-2xl shrink-0 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                width: '48px', height: '44px',
                backgroundColor: listening ? 'var(--accent)' : 'rgba(var(--accent-rgb, 99,102,241),0.18)',
                border: `2px solid ${listening ? 'var(--accent)' : 'rgba(var(--accent-rgb, 99,102,241),0.45)'}`,
                color: listening ? 'var(--accent-text)' : 'var(--accent)',
              }}
            >
              {listening
                ? <MicOff className="w-5 h-5" aria-hidden />
                : <Mic    className="w-5 h-5" aria-hidden />
              }
              {/* Point vert "actif" */}
              {listening && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: '#22c55e', border: '1.5px solid var(--bg)' }} aria-hidden />
              )}
            </button>
          )}

          {/* Champ texte */}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={hasSpeech ? 'Ou écris ta question…' : 'Demande-moi quelque chose…'}
            aria-label="Message pour l'assistant culinaire"
            className="flex-1 text-xs px-3 py-2.5 rounded-xl outline-none"
            style={{ backgroundColor: inputBg, border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text)' }}
          />

          {/* Envoyer */}
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
