'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

interface UseVoiceCookingOptions {
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
  onConfirm?: () => void;
  currentStepText: string;
  ingredientsText?: string;
  introText?: string;
  waitingForConfirm?: boolean;
  allStepsTexts?: string[];
}

type TTSEngine = 'elevenlabs' | 'native' | 'none';
type STTEngine = 'elevenlabs' | 'native' | 'none';

export function useVoiceCooking({ onNext, onPrev, onRepeat, onConfirm, currentStepText, ingredientsText, waitingForConfirm, allStepsTexts }: UseVoiceCookingOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [supported, setSupported] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<TTSEngine>('none');
  const [sttEngine, setSttEngine] = useState<STTEngine>('none');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCache = useRef<Map<string, Blob>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  // Detect engines on mount
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      let elAvailable = false;
      try {
        const res = await fetch('/api/tts');
        if (res.ok) {
          const data = await res.json();
          elAvailable = data.configured === true;
        }
      } catch {
        elAvailable = false;
      }
      console.log('[VoiceCooking] ElevenLabs configured:', elAvailable);

      if (!mountedRef.current) return;

      if (elAvailable) {
        setTtsEngine('elevenlabs');
      } else if ('speechSynthesis' in window) {
        setTtsEngine('native');
      }

      if (elAvailable && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        setSttEngine('elevenlabs');
      } else {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) setSttEngine('native');
      }

      console.log('[VoiceCooking] TTS:', elAvailable ? 'elevenlabs' : ('speechSynthesis' in window ? 'native' : 'none'));
      console.log('[VoiceCooking] STT:', elAvailable && navigator.mediaDevices ? 'elevenlabs' : (window.SpeechRecognition || window.webkitSpeechRecognition ? 'native' : 'none'));
      setSupported(true);
    })();

    return () => { mountedRef.current = false; };
  }, []);

  // Pre-cache all step audio (ElevenLabs) — only if first call succeeds
  const preCacheAttemptedRef = useRef(false);
  useEffect(() => {
    if (ttsEngine !== 'elevenlabs' || !allStepsTexts?.length || preCacheAttemptedRef.current) return;
    preCacheAttemptedRef.current = true;

    (async () => {
      // Test with first step before caching all
      const firstText = allStepsTexts.find(t => t);
      if (!firstText) return;
      try {
        const testRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: firstText, lang: 'fr' }),
        });
        if (!testRes.ok) {
          console.warn('[VoiceCooking] Pre-cache skipped — TTS returned', testRes.status);
          return;
        }
        const firstBlob = await testRes.blob();
        audioCache.current.set(firstText, firstBlob);
      } catch {
        console.warn('[VoiceCooking] Pre-cache skipped — TTS unreachable');
        return;
      }

      // First call succeeded — cache the rest
      for (const text of allStepsTexts) {
        if (!text || audioCache.current.has(text)) continue;
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang: 'fr' }),
          });
          if (res.ok) {
            const blob = await res.blob();
            audioCache.current.set(text, blob);
          }
        } catch {}
      }
      console.log('[VoiceCooking] Pre-cached', audioCache.current.size, 'steps');
    })();
  }, [ttsEngine, allStepsTexts]);

  // ── TTS ──
  const speak = useCallback(async (text: string) => {
    if (!text) return;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    if (ttsEngine === 'elevenlabs') {
      try {
        let blob = audioCache.current.get(text);
        if (!blob) {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang: 'fr' }),
          });
          if (res.ok) {
            blob = await res.blob();
            audioCache.current.set(text, blob);
          } else {
            console.warn('[VoiceCooking] TTS 502, falling back to native');
          }
        }
        if (blob) {
          setIsSpeaking(true);
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); currentAudioRef.current = null; };
          audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); currentAudioRef.current = null; };
          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('[VoiceCooking] ElevenLabs TTS failed, falling back to native:', err);
      }
    }

    // Fallback native
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [ttsEngine]);

  // ── Normalize: strip accents, punctuation, parenthetical noise ──
  function normalize(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
      .replace(/\(.*?\)/g, '')                            // remove (bruit de fond) etc.
      .replace(/[^a-z0-9\s']/g, '')                       // keep only letters/numbers
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hasWord(text: string, ...words: string[]): boolean {
    return words.some(w => text.includes(w));
  }

  // ── Command processor ──
  const processCommand = useCallback((transcript: string) => {
    const raw = transcript.trim();
    if (!raw) return;

    const t = normalize(raw);

    // Ignore noise: too short, too long (EL Scribe hallucinations), or no real words
    if (t.length < 2 || t.length > 120) {
      console.log('[VoiceCooking] Ignored (noise/hallucination):', raw.slice(0, 60));
      return;
    }

    setLastCommand(raw);

    // Confirmer (tolerant: confirme, confirmer, confirmé, ok, oui, go, etc.)
    if (waitingForConfirm && hasWord(t, 'confirm', 'ok', 'oui', 'parti', 'go', 'commenc', 'on y va', 'pret', 'allons', 'allez', 'lance', 'demarre', 'start', 'let')) {
      if (onConfirm) onConfirm();
      return;
    }

    // Suivant
    if (hasWord(t, 'suivant', 'next', 'suite', 'apres', 'continu', 'prochaine', 'avance', 'etape suivante')) {
      onNext();
    }
    // Précédent
    else if (hasWord(t, 'precedent', 'retour', 'revenir', 'back', 'recule', 'reviens', 'etape precedente')) {
      onPrev();
    }
    // Répète
    else if (hasWord(t, 'repete', 'repeter', 'encore', 'relis', 'repeat', 'redis', 'redit')) {
      speak(currentStepText);
    }
    // Ingrédients
    else if (hasWord(t, 'ingredient', 'il me faut', 'il faut quoi', 'liste')) {
      speak(ingredientsText || currentStepText);
    }
    // Stop
    else if (hasWord(t, 'arrete', 'stop', 'pause', 'silence', 'chut', 'tais')) {
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    // Lire étape
    else if (hasWord(t, 'lis', 'lire', 'dis moi', 'on en est ou', 'c\'est quoi')) {
      speak(currentStepText);
    }
    // Aide
    else if (hasWord(t, 'aide', 'help', 'commande')) {
      speak('Tu peux dire : confirmer, suivant, précédent, répète, ingrédients, ou stop.');
    }
  }, [onNext, onPrev, onRepeat, onConfirm, currentStepText, ingredientsText, waitingForConfirm, speak]);

  // ── ElevenLabs STT chunk ──
  const sendAudioChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    // Don't process audio while TTS is speaking (avoids hearing ourselves)
    if (isSpeaking) return;
    try {
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      const res = await fetch('/api/stt', { method: 'POST', body: form });
      if (res.ok) {
        const { text } = await res.json();
        console.log('[VoiceCooking] STT result:', text || '(silence)');
        if (text) processCommand(text);
      } else {
        console.warn('[VoiceCooking] STT error:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.warn('[VoiceCooking] STT fetch failed:', err);
    }
  }, [processCommand, isSpeaking]);

  // ── Native Web Speech API STT ──
  const startNativeSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      processCommand(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [processCommand]);

  // ── ElevenLabs STT (MediaRecorder) ──
  const startElevenLabsSTT = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      console.log('[VoiceCooking] Mic stream acquired');

      const startRecording = () => {
        if (!mediaStreamRef.current) return;
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          if (chunks.length > 0) sendAudioChunk(new Blob(chunks, { type: mimeType }));
          if (mediaStreamRef.current) startRecording();
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        recordingTimeoutRef.current = setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, 3000);
      };

      startRecording();
      setIsListening(true);
    } catch (err) {
      console.warn('[VoiceCooking] MediaRecorder failed, falling back to native:', err);
      startNativeSTT();
    }
  }, [sendAudioChunk, startNativeSTT]);

  // ── Public API ──
  const startListening = useCallback((greeting?: string) => {
    if (greeting) speak(greeting);
    else speak('Mode cuisine vocal activé. Dis suivant, précédent ou répète.');

    if (sttEngine === 'elevenlabs') {
      startElevenLabsSTT();
    } else {
      startNativeSTT();
    }
  }, [sttEngine, startElevenLabsSTT, startNativeSTT, speak]);

  const stopListening = useCallback(() => {
    if (recordingTimeoutRef.current) { clearTimeout(recordingTimeoutRef.current); recordingTimeoutRef.current = null; }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    window.speechSynthesis?.cancel();
    setIsListening(false);
    setIsSpeaking(false);
    setLastCommand('');
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); }
      if (currentAudioRef.current) currentAudioRef.current.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Auto-read step change
  useEffect(() => {
    if (isListening && currentStepText) speak(currentStepText);
  }, [currentStepText]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isListening, isSpeaking, lastCommand, supported, startListening, stopListening, speak, ttsEngine, sttEngine };
}
