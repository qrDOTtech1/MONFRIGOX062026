import { prisma } from './db';
import { estimateNutrition } from './ollama';

const USER_AGENT = 'Mozilla/5.0 (compatible; MonFrigoBot/1.0)';
const SITEMAP_INDEX = 'https://www.marmiton.org/wsitemap_recipes_index.xml';
const CURSOR_KEY = 'recipe_import_cursor';
const ENABLED_KEY = 'recipe_import_enabled';

const DISALLOWED_PATTERNS = [
  /\/recettes\/private/i,
  /\/recettes\/v2/i,
  /\/recettes\/diapo/i,
  /\/recettes\/recette-impression/i,
  /\/recettes\/envoyer-ami/i,
  /\/recettes\/commentaire-ajout/i,
  /\/espace-perso\//i,
  /\/mon-espace\//i,
];

// Cache mémoire process — évite de retélécharger le sitemap à chaque tick du scheduler
let urlListCache: string[] | null = null;
let urlListFetchedAt = 0;
const URL_LIST_TTL_MS = 12 * 60 * 60 * 1000; // 12h

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function getUrlList(): Promise<string[]> {
  if (urlListCache && Date.now() - urlListFetchedAt < URL_LIST_TTL_MS) return urlListCache;

  const indexXml = await fetchText(SITEMAP_INDEX);
  const subSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  const all = new Set<string>();
  for (const sub of subSitemaps) {
    try {
      const xml = await fetchText(sub);
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
        .filter(u => !DISALLOWED_PATTERNS.some(p => p.test(u)));
      urls.forEach(u => all.add(u));
    } catch { /* on continue avec les autres sous-sitemaps */ }
  }

  urlListCache = [...all];
  urlListFetchedAt = Date.now();
  return urlListCache;
}

function parseIsoDurationToMinutes(iso: string | undefined): number {
  if (!iso) return 30;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 30;
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  return h * 60 + min || 30;
}

function extractRecipeJsonLd(html: string): any | null {
  const start = html.indexOf('{"@context":"http://schema.org","@type":"Recipe"');
  if (start === -1) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function extractDifficulty(html: string): string {
  const m = html.match(/"recipeDifficulty":"([^"]*)"/);
  const map: Record<string, string> = { facile: 'FACILE', moyen: 'MOYEN', difficile: 'DIFFICILE' };
  return (m && map[m[1]]) || 'FACILE';
}

interface StructuredIngredient { name: string; qty: number | string; unit: string }

function extractStructuredIngredients(html: string): StructuredIngredient[] | null {
  const m = html.match(/Mrtn\.recipesData\s*=\s*(\{.*?\});/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return data?.recipes?.[0]?.ingredients ?? null;
  } catch {
    return null;
  }
}

function parseServings(recipeYield: string | undefined): number {
  const m = (recipeYield || '').match(/\d+/);
  return m ? parseInt(m[0]) : 4;
}

async function getCursor(): Promise<number> {
  const row = await prisma.appConfig.findUnique({ where: { key: CURSOR_KEY } });
  return row ? parseInt(row.value) || 0 : 0;
}

async function setCursor(value: number): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: CURSOR_KEY },
    update: { value: String(value) },
    create: { key: CURSOR_KEY, value: String(value) },
  });
}

/** Statut courant pour l'admin : progression + activé/désactivé. */
export async function getImportStatus(): Promise<{ cursor: number; total: number; enabled: boolean }> {
  const [cursorRow, enabledRow, urls] = await Promise.all([
    prisma.appConfig.findUnique({ where: { key: CURSOR_KEY } }),
    prisma.appConfig.findUnique({ where: { key: ENABLED_KEY } }),
    getUrlList().catch(() => urlListCache ?? []),
  ]);
  return {
    cursor: cursorRow ? parseInt(cursorRow.value) || 0 : 0,
    total: urls.length,
    enabled: enabledRow ? enabledRow.value !== 'false' : true, // activé par défaut
  };
}

export async function isImportEnabled(): Promise<boolean> {
  const row = await prisma.appConfig.findUnique({ where: { key: ENABLED_KEY } });
  return row ? row.value !== 'false' : true;
}

export async function setImportEnabled(enabled: boolean): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: ENABLED_KEY },
    update: { value: String(enabled) },
    create: { key: ENABLED_KEY, value: String(enabled) },
  });
}

/**
 * Importe un petit lot de recettes en continu, en avançant un curseur persistant.
 * Boucle indéfiniment sur la liste (rafraîchie périodiquement) : une fois arrivé au bout,
 * repart de zéro — les nouvelles recettes ajoutées entre-temps sont ainsi récupérées aussi,
 * et les doublons sont naturellement ignorés (déduplication par nom).
 */
export async function importNextBatch(batchSize = 5): Promise<{ imported: number; skipped: number; failed: number; cursor: number; total: number }> {
  if (!(await isImportEnabled())) return { imported: 0, skipped: 0, failed: 0, cursor: await getCursor(), total: urlListCache?.length ?? 0 };

  const urls = await getUrlList();
  if (urls.length === 0) return { imported: 0, skipped: 0, failed: 0, cursor: 0, total: 0 };

  let cursor = await getCursor();
  if (cursor >= urls.length) cursor = 0; // on reboucle, capte les nouveautés du site

  let imported = 0, skipped = 0, failed = 0;

  for (let i = 0; i < batchSize && cursor + i < urls.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 300)); // léger espacement entre requêtes
    const url = urls[cursor + i];
    try {
      const html = await fetchText(url);
      const ld = extractRecipeJsonLd(html);
      if (!ld || !ld.name || !ld.recipeIngredient?.length) { failed++; continue; }

      const exists = await prisma.recipe.findFirst({ where: { name: { equals: ld.name, mode: 'insensitive' } } });
      if (exists) { skipped++; continue; }

      const structured = extractStructuredIngredients(html);
      const difficulty = extractDifficulty(html);
      const instructions = (ld.recipeInstructions || [])
        .map((s: any) => (typeof s === 'string' ? s : s.text || ''))
        .filter(Boolean)
        .join('\n');
      if (!instructions) { failed++; continue; }

      const recipeIngredients: Array<{ ingredientId: string; quantity: number; unit: string; name: string }> = [];
      const source = structured?.length ? structured : (ld.recipeIngredient || []).map((t: string) => ({ name: t, qty: 1, unit: '' }));

      for (const ing of source) {
        const rawName = String(ing.name || '').trim();
        if (!rawName) continue;
        const ingName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
        let ingredient = await prisma.ingredient.findFirst({ where: { name: { equals: ingName, mode: 'insensitive' } } });
        if (!ingredient) {
          ingredient = await prisma.ingredient.create({ data: { name: ingName, category: 'Autres', emoji: '🍽️' } }).catch(() => null);
        }
        if (!ingredient) continue;
        const qty = typeof ing.qty === 'number' ? ing.qty : parseFloat(String(ing.qty).replace(',', '.')) || 1;
        const unit = String(ing.unit || '') || 'unité';
        recipeIngredients.push({ ingredientId: ingredient.id, quantity: qty || 1, unit, name: ingName });
      }

      if (recipeIngredients.length === 0) { failed++; continue; }

      const servings = parseServings(ld.recipeYield);

      const created = await prisma.recipe.create({
        data: {
          name: ld.name,
          description: (ld.description || '').slice(0, 500) || `${ld.name} — recette maison`,
          instructions,
          difficulty: difficulty as any,
          // Le modèle n'a qu'un seul champ temps affiché aux utilisateurs → on prend le temps total
          // (prépa + cuisson), sinon un plat qui mijote 2h afficherait "10 min" de façon trompeuse.
          prepTime: parseIsoDurationToMinutes(ld.totalTime || ld.prepTime),
          cuisine: ld.recipeCuisine || ld.recipeCategory || 'Maison',
          servings,
          imageUrl: Array.isArray(ld.image) ? ld.image[0] : (ld.image || ''),
          isPublic: true,
          ingredients: { create: recipeIngredients.map(({ ingredientId, quantity, unit }) => ({ ingredientId, quantity, unit })) },
        },
      });

      // Enrichissement nutrition immédiat — zéro demi-mesure, chaque recette importée est complète dès le départ.
      try {
        const nutrition = await estimateNutrition(
          ld.name,
          recipeIngredients.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
          servings,
        );
        await prisma.recipe.update({
          where: { id: created.id },
          data: {
            calories: nutrition.calories,
            protein: nutrition.protein,
            fat: nutrition.fat,
            carbs: nutrition.carbs,
            fiber: nutrition.fiber,
            salt: nutrition.salt,
            nutriScore: nutrition.nutriScore,
            kidFriendly: nutrition.kidFriendly,
            babyFriendly: nutrition.babyFriendly,
          },
        });
      } catch {
        // La recette reste valide sans nutrition — un futur passage "Nutrition seule" pourra la compléter.
      }

      imported++;
    } catch {
      failed++;
    }
  }

  const newCursor = cursor + batchSize;
  await setCursor(newCursor);

  return { imported, skipped, failed, cursor: newCursor, total: urls.length };
}
