'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Mascot, { MascotVariant } from './Mascot';
import { Send, Mic, MicOff, Trash2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface RecipeMini {
  id: string;
  name: string;
  difficulty: string;
  prepTime: number;
  cuisine: string;
  imageUrl: string;
  ingredients?: Array<{ ingredient: { emoji: string } }>;
}

const STORAGE_KEY = 'mf_chat_history';
const MAX_MESSAGES = 60;

const SUGGESTIONS = [
  'Que manger ce soir ?',
  'Recette en moins de 20min',
  'Aide-moi à vider mon frigo',
  'Plan repas de la semaine',
];

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Salut ! 👋 Je suis ton assistant culinaire. Pose-moi n\'importe quelle question sur les recettes, ton frigo ou la nutrition !',
  timestamp: 0,
};

export default function MascotChat({ allRecipes, embedded = false }: { allRecipes: RecipeMini[]; embedded?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mascotState, setMascotState] = useState<MascotVariant>('wink');
  const [listening, setListening] = useState(false);
  const [hasSpeech, setHasSpeech] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const sendRef = useRef<(text?: string) => void>(undefined);

  useEffect(() => {
    setHasSpeech(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? 'Désolé, je n\'ai pas pu répondre.',
        timestamp: Date.now(),
      }]);
      setMascotState('excited');
      setTimeout(() => setMascotState('wink'), 3000);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Une erreur est survenue, réessaie !',
        timestamp: Date.now(),
      }]);
      setMascotState('worried');
      setTimeout(() => setMascotState('wink'), 4000);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  sendRef.current = send;

  function clearHistory() {
    const reset = [{ ...WELCOME, content: 'C\'est reparti ! 😄 Pose-moi ta question.', timestamp: Date.now() }];
    setMessages(reset);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      recognitionRef.current = null;
      return;
    }
    const recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setTimeout(() => sendRef.current?.(text), 100);
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  const showSuggestions = messages.length <= 1 && !loading;

  const bubbleBg   = 'rgba(8,8,12,0.88)';      // bulle assistant
  const inputBg    = 'rgba(8,8,12,0.82)';      // champ de saisie
  const suggBg     = 'rgba(18,18,26,0.85)';    // chips suggestions

  return (
    <div className={embedded ? '' : 'card overflow-hidden'}>
      {/* Header — masqué en mode embedded (la card parente fait déjà l'encadrement) */}
      {!embedded && (
        <div className="flex items-center gap-3 px-4 pt-3 pb-2.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Mascot variant={mascotState} size="sm" animate={loading ? 'bounce' : 'float'} />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold leading-tight">Assistant culinaire</h2>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              {loading ? '🤔 En train de réfléchir…' : `${allRecipes.length} recettes disponibles`}
            </p>
          </div>
          <button onClick={clearHistory} className="p-1.5 rounded-lg transition-colors hover:opacity-70"
            style={{ color: 'var(--text-muted)' }} title="Effacer l'historique">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Séparateur + statut quand embedded */}
      {embedded && (
        <div className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {loading ? '🤔 En train de réfléchir…' : '💬 Assistant culinaire'}
          </p>
          <button onClick={clearHistory} className="p-1 rounded-lg hover:opacity-70"
            style={{ color: 'var(--text-muted)' }} title="Effacer l'historique">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="h-48 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'}`}
              style={msg.role === 'user'
                ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                : { backgroundColor: bubbleBg, color: 'var(--text)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
              style={{ backgroundColor: bubbleBg, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="flex items-center gap-1">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: 'var(--text-muted)', animationDelay: `${delay}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-[10px] px-2.5 py-1 rounded-full transition-colors active:scale-95"
              style={{ backgroundColor: suggBg, border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        {hasSpeech && (
          <button onClick={toggleVoice}
            className="p-2 rounded-xl shrink-0 transition-all active:scale-95"
            style={{
              backgroundColor: listening ? 'var(--accent)' : inputBg,
              color: listening ? 'var(--accent-text)' : 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Demande-moi quelque chose…"
          className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
          style={{
            backgroundColor: inputBg,
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text)',
          }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="p-2 rounded-xl shrink-0 transition-all active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
