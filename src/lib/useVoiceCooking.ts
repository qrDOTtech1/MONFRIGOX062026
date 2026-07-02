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
  onAskAI?: (question: string) => void;
  onRepeatStep?: (stepIndex: number) => void;
  onSelectOption?: (optionIndex: number) => void;
  onHelp?: () => void;
  onTimerStart?: () => void;
  onTimerStop?: () => void;
  onTimerReset?: () => void;
  onFinish?: () => void;
  onPlayMusic?: () => void;
  onPlayMatchingMusic?: () => void;
  onPauseMusic?: () => void;
  onResumeMusic?: () => void;
  onNextMusic?: () => void;
  onPrevMusic?: () => void;
  onSurpriseMusic?: () => void;
  onWhichMusic?: () => void;
  onVolumeUpMusic?: () => void;
  onVolumeDownMusic?: () => void;
  onMaxVolumeMusic?: () => void;
  onStopMusic?: () => void;
  onPlayQuiz?: () => void;
  currentStepText: string;
  currentStep?: number;
  totalSteps?: number;
  ingredientsText?: string;
  introText?: string;
  waitingForConfirm?: boolean;
  allStepsTexts?: string[];
  musicActive?: boolean;
}

type TTSEngine = 'elevenlabs' | 'native' | 'none';
type STTEngine = 'elevenlabs' | 'native' | 'none';

export function useVoiceCooking({ onNext, onPrev, onRepeat, onConfirm, onAskAI, onRepeatStep, onSelectOption, onHelp, onTimerStart, onTimerStop, onTimerReset, onFinish, onPlayMusic, onPlayMatchingMusic, onPauseMusic, onResumeMusic, onNextMusic, onPrevMusic, onSurpriseMusic, onWhichMusic, onVolumeUpMusic, onVolumeDownMusic, onMaxVolumeMusic, onStopMusic, onPlayQuiz, currentStepText, currentStep, totalSteps, ingredientsText, waitingForConfirm, allStepsTexts, musicActive }: UseVoiceCookingOptions) {
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
  const speakingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeSampleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxVolumeRef = useRef(0);
  const lastAIIntentAtRef = useRef(0);
  const musicActiveRef = useRef(false);
  const noiseFloorRef = useRef(0);

  useEffect(() => { musicActiveRef.current = !!musicActive; }, [musicActive]);

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

      // Prefer native Web Speech STT when available (free, faster, no hallucinations) — fall back to ElevenLabs otherwise
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        setSttEngine('native');
      } else if (elAvailable && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        setSttEngine('elevenlabs');
      }

      console.log('[VoiceCooking] TTS:', elAvailable ? 'elevenlabs' : ('speechSynthesis' in window ? 'native' : 'none'));
      console.log('[VoiceCooking] STT:', SR ? 'native' : (elAvailable && navigator.mediaDevices ? 'elevenlabs' : 'none'));
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
        audioCache.current.set(`cuisine:${firstText}`, firstBlob);
      } catch {
        console.warn('[VoiceCooking] Pre-cache skipped — TTS unreachable');
        return;
      }

      // First call succeeded — cache the rest
      for (const text of allStepsTexts) {
        if (!text || audioCache.current.has(`cuisine:${text}`)) continue;
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang: 'fr', voice: 'cuisine' }),
          });
          if (res.ok) {
            const blob = await res.blob();
            audioCache.current.set(`cuisine:${text}`, blob);
          }
        } catch {}
      }
      console.log('[VoiceCooking] Pre-cached', audioCache.current.size, 'steps');
    })();
  }, [ttsEngine, allStepsTexts]);

  // ── Pause/resume mic around TTS ──
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justResumedRef = useRef(false);

  function stopVolumeSampling() {
    if (volumeSampleRef.current) { clearInterval(volumeSampleRef.current); volumeSampleRef.current = null; }
  }

  // ── RMS volume gate — skip sending near-silent chunks to STT (avoids hallucinations + saves cost) ──
  function ensureAnalyser() {
    if (analyserRef.current || !mediaStreamRef.current) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const source = ctx.createMediaStreamSource(mediaStreamRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    } catch {}
  }

  function startVolumeSampling() {
    ensureAnalyser();
    stopVolumeSampling();
    maxVolumeRef.current = 0;
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    volumeSampleRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const norm = (data[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      if (rms > maxVolumeRef.current) maxVolumeRef.current = rms;

      // Traque le bruit de fond (musique) : descend vite, remonte lentement — approxime le plancher réel
      if (noiseFloorRef.current === 0 || rms < noiseFloorRef.current) {
        noiseFloorRef.current = rms;
      } else {
        noiseFloorRef.current = noiseFloorRef.current * 0.98 + rms * 0.02;
      }
    }, 100);
  }

  const SILENCE_RMS_THRESHOLD = 0.02;

  // Avec de la musique en fond, le seuil fixe ne suffit plus : on exige un pic nettement
  // au-dessus du bruit ambiant mesuré, plutôt qu'une constante absolue.
  function getEffectiveSilenceThreshold(): number {
    if (!musicActiveRef.current) return SILENCE_RMS_THRESHOLD;
    return Math.max(SILENCE_RMS_THRESHOLD, noiseFloorRef.current * 2.2);
  }

  // Un seul MediaRecorder pour toute la session d'écoute (démarré une fois dans startContinuousRecording).
  // On ne le stoppe/redémarre plus jamais pendant la session : sur mobile, chaque stop/start de
  // MediaRecorder déclenche un petit son système — en boucle toutes les 3s + à chaque tour de TTS,
  // ça donnait un "concert" de bips. On mute/démute juste la piste audio à la place (silencieux).
  function pauseMic() {
    if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
    // Physically mute the input so no audio can be captured while the app talks
    mediaStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
  }

  function resumeMic() {
    if (!mediaStreamRef.current) return;
    // Re-enable the muted input track
    mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
    justResumedRef.current = true;
    setTimeout(() => { justResumedRef.current = false; }, 350);
  }

  function startContinuousRecording() {
    if (!mediaStreamRef.current || mediaRecorderRef.current) return;

    // Si le TTS parle déjà (ex: message d'accueil en cours) au moment où le flux micro arrive,
    // on démarre muet pour ne pas capter sa propre voix dès la première tranche.
    if (speakingRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      const hadSpeech = maxVolumeRef.current > getEffectiveSilenceThreshold();
      maxVolumeRef.current = 0; // reset pour la tranche suivante
      if (e.data.size === 0 || speakingRef.current || justResumedRef.current) return;
      if (hadSpeech) {
        sendAudioChunkRef.current(e.data);
      } else {
        console.log('[VoiceCooking] Skipped silent chunk');
      }
    };

    mediaRecorderRef.current = recorder;
    startVolumeSampling();
    recorder.start(3000); // timeslice : ondataavailable toutes les 3s SANS jamais stopper l'enregistrement
  }

  function markSpeaking(val: boolean) {
    speakingRef.current = val;
    setIsSpeaking(val);
    if (val) {
      pauseMic();
    } else if (mediaStreamRef.current) {
      // Delay before resuming mic to avoid catching the acoustic tail of TTS through the speaker
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        resumeTimeoutRef.current = null;
        if (!speakingRef.current && mediaStreamRef.current) resumeMic();
      }, 900);
    }
  }

  // ── TTS ──
  const speak = useCallback(async (text: string, voiceChannel: 'cuisine' | 'ia' | 'easter' = 'cuisine') => {
    if (!text) return;

    // Stop any current playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    markSpeaking(true);

    if (ttsEngine === 'elevenlabs') {
      try {
        const cacheKey = `${voiceChannel}:${text}`;
        let blob = audioCache.current.get(cacheKey);
        if (!blob) {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang: 'fr', voice: voiceChannel }),
          });
          if (res.ok) {
            blob = await res.blob();
            audioCache.current.set(cacheKey, blob);
          }
        }
        if (blob) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; markSpeaking(false); };
          audio.onerror = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; markSpeaking(false); };
          await audio.play();
          return;
        }
      } catch {}
    }

    // Fallback native
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => markSpeaking(false);
      utterance.onerror = () => markSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      markSpeaking(false);
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

  // ── Extract a small number (1-9) from text, digit or spelled-out French word ──
  const NUMBER_WORDS: Record<string, number> = {
    un: 1, une: 1, premier: 1, premiere: 1,
    deux: 2, deuxieme: 2, second: 2, seconde: 2,
    trois: 3, troisieme: 3,
    quatre: 4, quatrieme: 4,
    cinq: 5, cinquieme: 5,
    six: 6, sixieme: 6,
    sept: 7, septieme: 7,
    huit: 8, huitieme: 8,
    neuf: 9, neuvieme: 9,
  };

  function findNumberNear(text: string, ...anchors: string[]): number | null {
    // 1) digit form directly after an anchor word
    const digitRe = new RegExp(`(?:${anchors.join('|')})[^0-9]{0,20}?(\\d+)`);
    const digitMatch = text.match(digitRe);
    if (digitMatch) return parseInt(digitMatch[1]);

    // 2) spelled-out number word after an anchor
    const wordsPattern = Object.keys(NUMBER_WORDS).join('|');
    const wordRe = new RegExp(`(?:${anchors.join('|')})\\s+(?:l[ae]\\s+|numero\\s+|n\\s+)*(${wordsPattern})\\b`);
    const wordMatch = text.match(wordRe);
    if (wordMatch) return NUMBER_WORDS[wordMatch[1]];

    // 3) bare digit anywhere near an anchor (fallback)
    const anyDigit = text.match(/\d+/);
    if (anyDigit && anchors.some(a => text.includes(a))) return parseInt(anyDigit[0]);

    return null;
  }

  // ── Command processor — returns label shown to user ──
  const processCommand = useCallback((transcript: string) => {
    const raw = transcript.trim();
    if (!raw) return;

    const t = normalize(raw);

    // Ignore noise: too short, too long (EL Scribe hallucinations)
    if (t.length < 2 || t.length > 150) {
      console.log('[VoiceCooking] Ignored:', raw.slice(0, 50));
      return;
    }

    let label = '';

    // Apostrophes create merged tokens ("l'étape" → "l'etape") that break anchor matching — strip them for these checks
    const tNoApos = t.replace(/'/g, ' ');

    // ── Musique (non documentée — cf. hint vocal) ──
    // Déclencheur volontairement large : le STT hallucine/déforme facilement ce mot,
    // et on préfère un faux positif rare à un repli sur l'IA qui ne connaît pas cette fonctionnalité cachée.
    let musicHandled = false;
    if (hasWord(t, 'musique', 'radio', 'music', 'playlist', 'ambiance sonore', 'fond sonore')) {
      if (hasWord(t, 'stop', 'arrete', 'coupe', 'eteins')) {
        label = '🎵 Stop musique';
        if (onStopMusic) onStopMusic();
        musicHandled = true;
      } else if (hasWord(t, 'pause')) {
        label = '🎵 Pause musique';
        if (onPauseMusic) onPauseMusic();
        musicHandled = true;
      } else if (hasWord(t, 'reprend', 'continue', 'relance', 'remet')) {
        label = '🎵 Reprend musique';
        if (onResumeMusic) onResumeMusic();
        musicHandled = true;
      } else if (hasWord(t, 'surprise', 'aleatoire', 'hasard', 'etonne')) {
        label = '🎵 Radio surprise';
        if (onSurpriseMusic) onSurpriseMusic();
        musicHandled = true;
      } else if (hasWord(t, 'precedente', 'davant', 'retour radio', 'radio davant')) {
        label = '🎵 Radio précédente';
        if (onPrevMusic) onPrevMusic();
        musicHandled = true;
      } else if (hasWord(t, 'suivante', 'change', 'autre', 'prochaine')) {
        label = '🎵 Radio suivante';
        if (onNextMusic) onNextMusic();
        musicHandled = true;
      } else if (hasWord(t, 'moins fort', 'baisse', 'plus bas')) {
        label = '🎵 Volume -';
        if (onVolumeDownMusic) onVolumeDownMusic();
        musicHandled = true;
      } else if (hasWord(t, 'volume max', 'a fond', 'au max', 'maximum', 'plein volume', 'plein pot')) {
        label = '🎵 Volume max';
        if (onMaxVolumeMusic) onMaxVolumeMusic();
        musicHandled = true;
      } else if (hasWord(t, 'plus fort', 'monte le son', 'augmente')) {
        label = '🎵 Volume +';
        if (onVolumeUpMusic) onVolumeUpMusic();
        musicHandled = true;
      } else if (hasWord(t, 'quelle radio', 'quelle station', 'cest quoi cette musique', 'quest ce que cest', 'ca joue quoi')) {
        label = '🎵 Radio actuelle';
        if (onWhichMusic) onWhichMusic();
        musicHandled = true;
      } else if (hasWord(t, 'va avec', 'qui correspond', 'adapte', 'accord avec', 'ambiance de la recette', 'colle a la recette', 'colle avec')) {
        label = '🎵 Musique assortie';
        if (onPlayMatchingMusic) onPlayMatchingMusic();
        musicHandled = true;
      } else {
        // Filet de sécurité : toute mention de musique/radio non reconnue plus haut
        // déclenche quand même la proposition de radios, plutôt que de tomber sur l'IA.
        label = '🎵 Musique';
        if (onPlayMusic) onPlayMusic();
        musicHandled = true;
      }
    }

    // ── Quiz culinaire (non documenté — cf. hint vocal) ──
    let quizHandled = false;
    if (!musicHandled && hasWord(t, 'jeu', 'quiz', 'defi', 'devine devinette')) {
      label = '🎲 Quiz';
      if (onPlayQuiz) onPlayQuiz();
      quizHandled = true;
    }

    // ── Sélection option IA ("option 1", "go pour option 2", "choix numéro trois") ──
    const optionNum = !musicHandled && !quizHandled && hasWord(t, 'option', 'choix') ? findNumberNear(tNoApos, 'option', 'choix', 'go') : null;
    if (musicHandled || quizHandled) {
      // handled above
    }
    else if (optionNum !== null && optionNum >= 1) {
      label = `👆 Option ${optionNum}`;
      if (onSelectOption) onSelectOption(optionNum - 1);
    }
    // ── Répète étape N ──
    else if ((() => {
      if (!hasWord(t, 'repete', 'repeter', 'relis', 'redis') || !tNoApos.includes('etape')) return false;
      const n = findNumberNear(tNoApos, 'etape');
      if (n !== null && n >= 1 && allStepsTexts && n <= allStepsTexts.length) {
        label = `🔁 Répète étape ${n}`;
        if (onRepeatStep) onRepeatStep(n - 1);
        else speak(`Étape ${n}. ${allStepsTexts[n - 1]}`);
        return true;
      }
      return false;
    })()) {
      // handled above
    }
    // ── Confirmer ──
    else if (waitingForConfirm && hasWord(t, 'confirm', 'confirme', 'confirmez', 'confirmer', 'ok', 'oui', 'parti', 'go', 'commenc', 'on y va', 'pret', 'allons', 'allez', 'lance', 'demarre', 'start', 'let', 'd\'accord', 'daccord', 'top', 'ready', 'envoie', 'envoi', 'valide', 'valider', 'c\'est bon', 'je suis pret')) {
      label = '✅ Confirmer';
      if (onConfirm) onConfirm();
    }
    // ── Suivant ──
    else if (hasWord(t, 'suivant', 'next', 'suite', 'apres', 'continu', 'prochaine', 'avance', 'etape suivante', 'passe', 'hop')) {
      label = '⏭ Suivant';
      onNext();
    }
    // ── Précédent ──
    else if (hasWord(t, 'precedent', 'retour', 'revenir', 'back', 'recule', 'reviens', 'etape precedente', 'avant', 'arriere')) {
      label = '⏮ Précédent';
      onPrev();
    }
    // ── Répète ──
    else if (hasWord(t, 'repete', 'repeter', 'encore', 'relis', 'repeat', 'redis', 'redit', 're dis', 'relire', 'reexpliqu')) {
      label = '🔁 Répète';
      speak(currentStepText);
    }
    // ── Ingrédients ──
    else if (hasWord(t, 'ingredient', 'il me faut', 'il faut quoi', 'liste', 'qu\'est ce qu\'il faut', 'besoin de quoi')) {
      label = '🥕 Ingrédients';
      speak(ingredientsText || currentStepText);
    }
    // ── Combien d'étapes / où j'en suis ──
    else if (hasWord(t, 'combien', 'ou j\'en suis', 'on en est ou', 'progression', 'il reste', 'encore combien')) {
      label = '📊 Progression';
      if (currentStep !== undefined && totalSteps) {
        speak(`Tu es à l'étape ${currentStep + 1} sur ${totalSteps}. Il reste ${totalSteps - currentStep - 1} étapes.`);
      } else {
        speak(currentStepText);
      }
    }
    // ── Timer ──
    else if (hasWord(t, 'minuteur', 'timer', 'chrono', 'temps', 'lance le timer', 'demarre le minuteur', 'top chrono')) {
      if (hasWord(t, 'arret', 'stop', 'pause', 'coupe')) {
        label = '⏸ Timer pause';
        if (onTimerStop) onTimerStop();
      } else if (hasWord(t, 'reset', 'reinitial', 'remet', 'recommenc')) {
        label = '🔄 Timer reset';
        if (onTimerReset) onTimerReset();
      } else {
        label = '⏱ Timer start';
        if (onTimerStart) onTimerStart();
      }
    }
    // ── Terminer ──
    else if (hasWord(t, 'termin', 'fini', 'j\'ai fini', 'c\'est bon', 'c\'est pret', 'bon appetit', 'termine')) {
      label = '🏁 Terminé';
      if (onFinish) onFinish();
    }
    // ── Stop voix ──
    else if (hasWord(t, 'arrete', 'stop', 'pause', 'silence', 'chut', 'tais')) {
      label = '🔇 Silence';
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
      window.speechSynthesis?.cancel();
      markSpeaking(false);
    }
    // ── Lire étape ──
    else if (hasWord(t, 'lis', 'lire', 'dis moi', 'c\'est quoi', 'quelle etape', 'qu\'est ce que je dois', 'explique')) {
      label = '📖 Lire étape';
      speak(currentStepText);
    }
    // ── Aide ──
    else if (hasWord(t, 'aide', 'help', 'commande', 'qu\'est ce que tu comprend', 'que dire')) {
      label = '❓ Aide';
      speak('Tu peux dire : confirmer, suivant, précédent, répète, ingrédients, minuteur, progression, terminer, ou dis "cheffe" suivi de ta question.');
      if (onHelp) onHelp();
    }
    // ── Wake word IA ("cheffe", "chef", "hey cheffe"…) ──
    else {
      const wakeMatch = t.match(/\b(?:hey\s+)?(cheffe|chef|hey\s*ia|dis\s*moi\s*cheffe)\b\s*(.*)/);
      if (wakeMatch) {
        const question = (wakeMatch[2] || '').trim();
        const now = Date.now();
        const minGapMs = 2500;
        if (onAskAI && now - lastAIIntentAtRef.current > minGapMs) {
          lastAIIntentAtRef.current = now;
          label = '🤖 Réflexion…';
          onAskAI(question || raw);
        }
      }
    }

    // Only show label for recognized commands
    if (label) {
      setLastCommand(label);
      console.log('[VoiceCooking] Command:', label);
    } else {
      console.log('[VoiceCooking] No command matched:', t.slice(0, 50));
    }
  }, [onNext, onPrev, onRepeat, onConfirm, onAskAI, onRepeatStep, onSelectOption, onHelp, onTimerStart, onTimerStop, onTimerReset, onFinish, onPlayMusic, onPlayMatchingMusic, onPauseMusic, onResumeMusic, onNextMusic, onPrevMusic, onSurpriseMusic, onWhichMusic, onVolumeUpMusic, onVolumeDownMusic, onMaxVolumeMusic, onStopMusic, onPlayQuiz, currentStepText, currentStep, totalSteps, ingredientsText, waitingForConfirm, allStepsTexts, speak]);

  // ── ElevenLabs STT chunk (ref-based to avoid stale closures) ──
  const sendAudioChunkRef = useRef(async (blob: Blob) => {});
  sendAudioChunkRef.current = async (blob: Blob) => {
    if (blob.size < 1000 || speakingRef.current) return;
    try {
      const form = new FormData();
      form.append('audio', blob, 'audio.webm');
      const res = await fetch('/api/stt', { method: 'POST', body: form });
      if (res.ok) {
        const { text } = await res.json();
        if (text) {
          console.log('[VoiceCooking] STT:', text.slice(0, 60));
          processCommand(text);
        }
      }
    } catch {}
  };

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
      if (speakingRef.current) return;
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      mediaStreamRef.current = stream;
      console.log('[VoiceCooking] Mic stream acquired');
      startContinuousRecording();
      setIsListening(true);
    } catch (err) {
      console.warn('[VoiceCooking] MediaRecorder failed, falling back to native:', err);
      startNativeSTT();
    }
  }, [startNativeSTT]);

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
    if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
    stopVolumeSampling();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current = null;

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
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      stopVolumeSampling();
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
