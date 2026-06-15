'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import fr from '@/locales/fr';
import en from '@/locales/en';

export const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
] as const;

export type Lang = string;

const staticTranslations: Record<string, Record<string, string>> = { fr, en };

interface I18nContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
  isLoading: false,
});

export function useT() {
  return useContext(I18nContext);
}

function getCacheKey(lang: string) {
  return `i18n_cache_${lang}`;
}

function loadCache(lang: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(lang: string, data: Record<string, string>) {
  try {
    localStorage.setItem(getCacheKey(lang), JSON.stringify(data));
  } catch {}
}

function detectLang(): string {
  if (typeof window === 'undefined') return 'fr';
  const stored = localStorage.getItem('lang');
  if (stored) return stored;
  const nav = navigator.language?.slice(0, 2) || 'en';
  const supported: string[] = LANGUAGES.map(l => l.code);
  return supported.includes(nav) ? nav : 'en';
}

async function translateBatch(texts: string[], to: string): Promise<string[]> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, from: 'fr', to }),
    });
    if (!res.ok) return texts;
    const data = await res.json();
    return data.translated || texts;
  } catch { return texts; }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>('fr');
  const [dynamicStrings, setDynamicStrings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const translatingRef = useRef(false);

  useEffect(() => {
    const detected = detectLang();
    setLangState(detected);
    if (detected !== 'fr' && detected !== 'en') {
      const cached = loadCache(detected);
      if (Object.keys(cached).length > 0) {
        setDynamicStrings(cached);
      }
    }
  }, []);

  useEffect(() => {
    if (lang === 'fr' || lang === 'en' || translatingRef.current) return;

    const cached = loadCache(lang);
    const frKeys = Object.keys(fr);
    const missing = frKeys.filter(k => !cached[k]);

    if (missing.length === 0) {
      setDynamicStrings(cached);
      return;
    }

    translatingRef.current = true;
    setIsLoading(true);

    const missingValues = missing.map(k => fr[k]);

    // Translate in batches of 100
    (async () => {
      const allTranslated: Record<string, string> = { ...cached };
      for (let i = 0; i < missing.length; i += 100) {
        const batchKeys = missing.slice(i, i + 100);
        const batchValues = missingValues.slice(i, i + 100);
        const results = await translateBatch(batchValues, lang);
        batchKeys.forEach((key, idx) => {
          allTranslated[key] = results[idx] || fr[key];
        });
        // Update progressively
        setDynamicStrings({ ...allTranslated });
        saveCache(lang, allTranslated);
      }
      setIsLoading(false);
      translatingRef.current = false;
    })();
  }, [lang]);

  const setLang = useCallback((l: string) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    document.documentElement.lang = l;
    if (l !== 'fr' && l !== 'en') {
      const cached = loadCache(l);
      setDynamicStrings(cached);
    } else {
      setDynamicStrings({});
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let str: string;
    if (lang === 'fr' || lang === 'en') {
      str = staticTranslations[lang]?.[key] ?? staticTranslations['fr']?.[key] ?? key;
    } else {
      str = dynamicStrings[key] ?? staticTranslations['fr']?.[key] ?? key;
    }
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }, [lang, dynamicStrings]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}
