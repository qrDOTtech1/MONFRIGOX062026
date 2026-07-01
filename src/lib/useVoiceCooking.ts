'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceCookingOptions {
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
  currentStepText: string;
  ingredientsText?: string;
}

export function useVoiceCooking({ onNext, onPrev, onRepeat, currentStepText, ingredientsText }: UseVoiceCookingOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [supported, setSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition) && 'speechSynthesis' in window);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const processCommand = useCallback((transcript: string) => {
    const t = transcript.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    setLastCommand(transcript);

    // Suivant
    if (t.includes('suivant') || t.includes('next') || t.includes('suite') || t.includes('apres') || t.includes('continuer') || t.includes('continue') || t.includes('etape suivante') || t.includes('prochaine') || t.includes('avance') || t.includes('go')) {
      onNext();
    }
    // Précédent
    else if (t.includes('precedent') || t.includes('retour') || t.includes('avant') || t.includes('revenir') || t.includes('back') || t.includes('recule') || t.includes('etape precedente') || t.includes('reviens')) {
      onPrev();
    }
    // Répète l'étape en cours
    else if (t.includes('repete') || t.includes('repeter') || t.includes('encore') || t.includes('relis') || t.includes('repeat') || t.includes('redis') || t.includes('redit') || t.includes('re dis') || t.includes('repetes') || t.includes('tu peux repeter')) {
      onRepeat();
      speak(currentStepText);
    }
    // Lire les ingrédients
    else if (t.includes('ingredient') || t.includes('ingredients') || t.includes('il me faut') || t.includes('il faut quoi') || t.includes('quels ingredients') || t.includes('liste')) {
      if (ingredientsText) {
        speak(ingredientsText);
      } else {
        speak(currentStepText);
      }
    }
    // Stop / pause
    else if (t.includes('arrete') || t.includes('stop') || t.includes('pause') || t.includes('silence') || t.includes('tais-toi') || t.includes('tais toi') || t.includes('chut')) {
      window.speechSynthesis.cancel();
    }
    // Lire l'étape actuelle
    else if (t.includes('lis') || t.includes('lire') || t.includes('dis') || t.includes('quoi') || t.includes('etape') || t.includes('on en est ou') || t.includes('c\'est quoi') || t.includes('qu\'est-ce')) {
      speak(currentStepText);
    }
    // Aide
    else if (t.includes('aide') || t.includes('help') || t.includes('commande') || t.includes('comment')) {
      speak('Tu peux dire : suivant, précédent, répète, ingrédients, ou stop.');
    }
  }, [onNext, onPrev, onRepeat, currentStepText, ingredientsText, speak]);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
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

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [processCommand]);

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

  useEffect(() => {
    if (isListening && currentStepText) {
      speak(currentStepText);
    }
  }, [currentStepText]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isListening, isSpeaking, lastCommand, supported, startListening, stopListening, speak };
}
