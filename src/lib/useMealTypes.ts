'use client';

import { useState, useEffect } from 'react';

export interface MealDef {
  type: 'BREAKFAST' | 'SNACK' | 'LUNCH' | 'DINNER';
  label: string;
  emoji: string;
}

export const ALL_MEALS: MealDef[] = [
  { type: 'BREAKFAST', label: 'Matin',    emoji: '🌅' },
  { type: 'SNACK',     label: 'Goûter',   emoji: '🍎' },
  { type: 'LUNCH',     label: 'Déjeuner', emoji: '☀️' },
  { type: 'DINNER',    label: 'Dîner',    emoji: '🌙' },
];

const DEFAULT_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'];

let cached: string[] | null = null;

export function useMealTypes(): MealDef[] {
  const [types, setTypes] = useState<string[]>(cached ?? DEFAULT_TYPES);

  useEffect(() => {
    if (cached) { setTypes(cached); return; }
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.tasteProfile) return;
        try {
          const taste = JSON.parse(data.tasteProfile);
          if (Array.isArray(taste.mealTypes) && taste.mealTypes.length > 0) {
            cached = taste.mealTypes;
            setTypes(taste.mealTypes);
          }
        } catch { /* keep default */ }
      })
      .catch(() => {});
  }, []);

  // Return only the meals matching user prefs, in display order
  return ALL_MEALS.filter(m => types.includes(m.type));
}
