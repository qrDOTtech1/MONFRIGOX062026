// ============================================================
//  Cache mémoire léger (style SWR) pour accélérer la navigation
// ------------------------------------------------------------
//  Problème réglé : plusieurs pages rechargeaient /api/recipes
//  (gros) à CHAQUE changement d'onglet → lenteur.
//  Ici, on télécharge une fois puis on réutilise le résultat
//  pendant "ttlMs". Après une modif du frigo, on invalide le cache.
// ============================================================

type Entry = { data: unknown; ts: number };
const cache = new Map<string, Entry>();

/**
 * Fetch avec cache mémoire.
 * - Si une version récente (< ttlMs) existe → renvoyée instantanément.
 * - Sinon on refait le fetch et on met à jour le cache.
 * - En cas d'erreur réseau, on renvoie l'ancienne valeur si dispo.
 */
export async function cachedFetch<T>(url: string, ttlMs = 60000): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (hit) return hit.data as T; // repli sur l'ancienne valeur
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as T;
    cache.set(url, { data, ts: Date.now() });
    return data;
  } catch (e) {
    if (hit) return hit.data as T;
    throw e;
  }
}

/** Renvoie immédiatement la valeur en cache (même périmée), ou undefined. */
export function peekCache<T>(url: string): T | undefined {
  return cache.get(url)?.data as T | undefined;
}

/**
 * Vide le cache.
 * - invalidate()            → tout
 * - invalidate('/api/recipes') → toutes les entrées dont l'URL contient ce texte
 */
export function invalidate(match?: string) {
  if (!match) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(match)) cache.delete(key);
  }
}
