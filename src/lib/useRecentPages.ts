'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PageDef {
  href: string;
  label: string;
  icon: string;        // emoji fallback for serialization
  color: string;
}

export const ALL_PAGES: PageDef[] = [
  { href: '/fridge',              label: 'Frigo',         icon: '🧊', color: '#10b981' },
  { href: '/scan',                label: 'Scanner',       icon: '📷', color: '#06b6d4' },
  { href: '/shopping',            label: 'Planning',      icon: '📅', color: '#8b5cf6' },
  { href: '/shopping?tab=courses',label: 'Courses',       icon: '🛒', color: '#ef4444' },
  { href: '/dashboard',           label: 'Recettes',      icon: '🍳', color: '#f59e0b' },
  { href: '/profile',             label: 'Mon profil',    icon: '👤', color: '#64748b' },
  { href: '/profile?tab=impact',  label: 'Mon impact',    icon: '🌿', color: '#22c55e' },
  { href: '/fridge?mode=vide-frigo', label: 'Vide-Frigo', icon: '♻️', color: '#10b981' },
  { href: '/home',                label: 'Accueil',       icon: '🏠', color: '#a855f7' },
];

export const DEFAULT_SHORTCUTS: PageDef[] = [
  ALL_PAGES.find(p => p.href === '/fridge?mode=vide-frigo')!,
  ALL_PAGES.find(p => p.href === '/scan')!,
  ALL_PAGES.find(p => p.href === '/fridge')!,
  ALL_PAGES.find(p => p.href === '/dashboard')!,
  ALL_PAGES.find(p => p.href === '/shopping?tab=courses')!,
  ALL_PAGES.find(p => p.href === '/profile?tab=impact')!,
];

const STORAGE_KEY = 'mf_recent_pages';
const MAX_RECENT = 3;

function readRecent(): PageDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const hrefs: string[] = JSON.parse(raw);
    return hrefs.map(h => ALL_PAGES.find(p => p.href === h)).filter(Boolean) as PageDef[];
  } catch { return []; }
}

export function trackPageVisit(href: string) {
  try {
    const page = ALL_PAGES.find(p => p.href === href);
    if (!page) return;
    const current = readRecent().map(p => p.href).filter(h => h !== href);
    const next = [href, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('mf_recent_update'));
  } catch {}
}

export function useRecentPages() {
  const [recent, setRecent] = useState<PageDef[]>([]);

  const refresh = useCallback(() => setRecent(readRecent()), []);

  useEffect(() => {
    refresh();
    window.addEventListener('mf_recent_update', refresh);
    return () => window.removeEventListener('mf_recent_update', refresh);
  }, [refresh]);

  // Merge: recent first, then defaults to fill up to 6
  const merged: PageDef[] = [...recent];
  for (const def of DEFAULT_SHORTCUTS) {
    if (merged.length >= 6) break;
    if (!merged.find(p => p.href === def.href)) merged.push(def);
  }

  return { recent, shortcuts: merged };
}
