'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Sombre par défaut : c'est l'identité de l'app. L'utilisateur garde le
    // bouton pour passer en clair (utile en cuisine, en plein jour).
    const stored = localStorage.getItem('theme') as Theme | null;
    setTheme(stored || 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Doit rester aligné sur --bg dans globals.css
    document.documentElement.style.background = theme === 'dark' ? '#0d0f14' : '#f7f8fa';
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggle() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  // Le script inline dans layout.tsx applique déjà le thème avant le premier paint
  // → pas besoin de bloquer le rendu sur mounted, zéro flash blanc
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
