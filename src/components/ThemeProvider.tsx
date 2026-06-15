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
    const stored = localStorage.getItem('theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(stored || preferred);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.background = theme === 'dark' ? '#0f0f11' : '#fafafa';
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
