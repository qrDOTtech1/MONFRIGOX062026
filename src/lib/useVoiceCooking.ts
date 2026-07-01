'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Browser Speech API types not included in default TS lib
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface UseVoiceCookingOptions {
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
  currentStepText: string;
}

export function useVoiceCooking({ onNext, onPrev, onRepeat, currentStepText }: UseVoiceCookingOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    setSupported(!!SR && 'speechSynthesis' in window);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const processCommand = useCallback((transcript: string) => {
    const t = transcript.toLowerCase().trim();
    setLastCommand(transcript);

    if (t.includes('suivant') || t.includes('next') || t.includes('suite') || t.includes('après') || t.includes('continuer')) {
      speak('Étape suivante');
      onNext();
    } else if (t.includes('précédent') || t.includes('retour') || t.includes('avant') || t.includes('revenir') || t.includes('back')) {
      speak('Étape précédente');
      onPrev();
    } else if (t.includes('répète') || t.includes('répéter') || t.includes('encore') || t.includes('relis') || t.includes('repeat')) {
      onRepeat();
      speak(currentStepText);
    } else if (t.includes('arrête') || t.includes('stop') || t.includes('pause') || t.includes('silence')) {
      window.speechSynthesis.cancel();
    } else if (t.includes('lis') || t.includes('lire') || t.includes('dis') || t.includes('quoi') || t.includes('étape')) {
      speak(currentStepText);
    }
  }, [onNext, onPrev, onRepeat, currentStepText, speak]);

  const startListening = useCallback(() => {
    const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      processCommand(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      // Redémarre automatiquement si toujours actif
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    speak('Mode cuisine vocal activé. Dis "suivant", "précédent" ou "répète".');
  }, [processCommand, speak]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsListening(false);
    setLastCommand('');
  }, []);

  // Arrêter proprement au démontage
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Lire l'étape automatiquement quand elle change et que le micro est actif
  useEffect(() => {
    if (isListening && currentStepText) {
      speak(currentStepText);
    }
  }, [currentStepText]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isListening, isSpeaking, lastCommand, supported, startListening, stopListening, speak };
}
