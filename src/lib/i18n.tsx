'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import fr from '@/locales/fr';
import en from '@/locales/en';

export type Lang = 'fr' | 'en';

const translations: Record<Lang, Record<string, string>> = { fr, en };

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
});

export function useT() {
  return useContext(I18nContext);
}

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'fr';
  const stored = localStorage.getItem('lang');
  if (stored === 'fr' || stored === 'en') return stored;
  const nav = navigator.language?.slice(0, 2);
  return nav === 'fr' ? 'fr' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let str = translations[lang]?.[key] ?? translations['fr']?.[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}
