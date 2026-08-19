'use client';

/**
 * Frigo local pour les visiteurs sans compte.
 *
 * Un invité doit pouvoir vivre le moment qui fait la valeur de l'app — ajouter
 * trois ingrédients et voir aussitôt ce qu'il peut cuisiner — AVANT qu'on lui
 * demande de s'inscrire. Le contenu est gardé dans le navigateur, puis versé
 * dans son compte à l'inscription : il ne perd rien.
 */

export interface GuestFridgeItem {
  ingredientId: string;
  name: string;
  emoji: string;
  addedAt: string;
}

const KEY = 'mf_guest_fridge';
const MAX_ITEMS = 40;

function read(): GuestFridgeItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(items: GuestFridgeItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new Event('guest-fridge-change'));
  } catch {
    /* quota plein ou stockage bloqué : on continue sans persister */
  }
}

export function getGuestFridge(): GuestFridgeItem[] {
  return read();
}

export function guestFridgeCount(): number {
  return read().length;
}

/** Identifiants d'ingrédients, pour demander les correspondances au serveur. */
export function guestFridgeIds(): string[] {
  return read().map(i => i.ingredientId);
}

export function addGuestItem(item: Omit<GuestFridgeItem, 'addedAt'>): GuestFridgeItem[] {
  const items = read();
  if (items.some(i => i.ingredientId === item.ingredientId)) return items;
  const next = [...items, { ...item, addedAt: new Date().toISOString() }];
  write(next);
  return next;
}

export function removeGuestItem(ingredientId: string): GuestFridgeItem[] {
  const next = read().filter(i => i.ingredientId !== ingredientId);
  write(next);
  return next;
}

export function clearGuestFridge() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event('guest-fridge-change'));
  } catch {
    /* ignore */
  }
}

/**
 * Verse le frigo local dans le compte qui vient d'être créé ou rejoint.
 * Appelée après une connexion/inscription réussie ; le local est vidé seulement
 * si le transfert a abouti, pour ne rien perdre en cas d'échec réseau.
 */
export async function migrateGuestFridge(): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;

  let moved = 0;
  for (const item of items) {
    try {
      const res = await fetch('/api/fridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId: item.ingredientId }),
      });
      if (res.ok) moved++;
    } catch {
      /* on tente les suivants */
    }
  }
  if (moved > 0) clearGuestFridge();
  return moved;
}
