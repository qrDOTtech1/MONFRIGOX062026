#!/usr/bin/env node
/**
 * Scraper local pour marmiton.org — usage personnel/recherche uniquement, hors production.
 *
 * ⚠️ Marmiton n'expose pas d'API publique et son contenu (textes, photos) est protégé par le
 * droit d'auteur. Ce script se contente de récupérer des pages publiques accessibles sans
 * authentification, en respectant robots.txt et un rythme de requêtes raisonnable. Il n'écrit
 * RIEN dans la base de données de l'app — les résultats vont dans data/marmiton/ en local pour
 * relecture et décision manuelle sur leur usage (droits d'auteur à vérifier avant toute
 * republication).
 *
 * Sources utilisées :
 *   - robots.txt (vérifié : /recettes/recette_*.aspx n'est pas disallow pour User-agent: *)
 *   - Sitemap officiel https://www.marmiton.org/wsitemap_recipes_index.xml (~8000 fiches)
 *   - Bloc JSON-LD schema.org/Recipe embarqué sur chaque fiche (donnée structurée fiable,
 *     pas de parsing HTML fragile)
 *
 * Usage :
 *   node scripts/scrape-marmiton.mjs --limit 200 --delay 1500
 *
 * Reprend automatiquement là où il s'était arrêté (data/marmiton/progress.json).
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'marmiton');
const URLS_FILE = join(DATA_DIR, 'urls.json');
const PROGRESS_FILE = join(DATA_DIR, 'progress.json');
const OUTPUT_FILE = join(DATA_DIR, 'recipes.jsonl');

const USER_AGENT = 'Mozilla/5.0 (compatible; MonFrigoResearchBot/1.0)';
const SITEMAP_INDEX = 'https://www.marmiton.org/wsitemap_recipes_index.xml';

// Chemins explicitement interdits par robots.txt (User-agent: *) — sécurité supplémentaire
// même si /recettes/recette_*.aspx est autorisé.
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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: 200, delay: 1500 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') opts.limit = parseInt(args[++i]) || opts.limit;
    if (args[i] === '--delay') opts.delay = parseInt(args[++i]) || opts.delay;
  }
  return opts;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function isAllowed(url) {
  return !DISALLOWED_PATTERNS.some(p => p.test(url));
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return res.text();
}

/** Récupère et met en cache localement la liste des URLs de recettes depuis le sitemap officiel. */
async function collectRecipeUrls() {
  if (existsSync(URLS_FILE)) {
    const cached = JSON.parse(readFileSync(URLS_FILE, 'utf-8'));
    console.log(`[urls] ${cached.length} URLs déjà en cache (${URLS_FILE})`);
    return cached;
  }

  console.log('[urls] Récupération du sitemap index…');
  const indexXml = await fetchText(SITEMAP_INDEX);
  const subSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  console.log(`[urls] ${subSitemaps.length} sous-sitemaps trouvés`);

  const allUrls = new Set();
  for (const sub of subSitemaps) {
    try {
      const xml = await fetchText(sub);
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(isAllowed);
      urls.forEach(u => allUrls.add(u));
      console.log(`[urls] ${sub.split('/').pop()} → +${urls.length} (total ${allUrls.size})`);
      await sleep(300);
    } catch (err) {
      console.warn(`[urls] Échec ${sub}:`, err.message);
    }
  }

  const list = [...allUrls];
  writeFileSync(URLS_FILE, JSON.stringify(list, null, 2));
  console.log(`[urls] ${list.length} URLs sauvegardées dans ${URLS_FILE}`);
  return list;
}

function loadProgress() {
  if (existsSync(PROGRESS_FILE)) return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
  return { done: [] };
}

function saveProgress(progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/** Parse la durée ISO 8601 (ex: "PT15M") en minutes. */
function parseIsoDurationToMinutes(iso) {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  const h = parseInt(m[1] || '0');
  const min = parseInt(m[2] || '0');
  return h * 60 + min;
}

/**
 * Extrait le bloc JSON-LD schema.org/Recipe embarqué dans la page (pas de parsing HTML fragile).
 * Utilise un comptage d'accolades plutôt qu'un regex à terminaison fixe : certains champs
 * optionnels (ex: recipeCuisine) sont parfois absents et cassaient une regex ancrée dessus.
 */
function extractRecipeJsonLd(html) {
  const start = html.indexOf('{"@context":"http://schema.org","@type":"Recipe"');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
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
        const raw = html.slice(start, i + 1);
        try { return JSON.parse(raw); } catch { return null; }
      }
    }
  }
  return null;
}

/** Extrait la difficulté + coût depuis le second bloc de données embarqué (unify_dataSlayer). */
function extractDifficultyAndCost(html) {
  const m = html.match(/"recipeDifficulty":"([^"]*)"[^}]*"recipeCost":"([^"]*)"/);
  if (!m) return { difficulty: null, cost: null };
  return { difficulty: m[1], cost: m[2] };
}

/** Extrait les ingrédients avec quantité/unité précises (Mrtn.recipesData, plus fiable que le texte libre du JSON-LD). */
function extractStructuredIngredients(html) {
  const m = html.match(/Mrtn\.recipesData\s*=\s*(\{.*?\});/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    return data?.recipes?.[0]?.ingredients ?? null;
  } catch {
    return null;
  }
}

async function scrapeOne(url) {
  const html = await fetchText(url);
  const ld = extractRecipeJsonLd(html);
  if (!ld) return null;

  const { difficulty, cost } = extractDifficultyAndCost(html);
  const structuredIngredients = extractStructuredIngredients(html);

  return {
    sourceUrl: url,
    name: ld.name || '',
    description: ld.description || '',
    image: Array.isArray(ld.image) ? ld.image[0] : ld.image || '',
    cuisine: ld.recipeCuisine || '',
    category: ld.recipeCategory || '',
    prepTime: parseIsoDurationToMinutes(ld.prepTime),
    cookTime: parseIsoDurationToMinutes(ld.cookTime),
    totalTime: parseIsoDurationToMinutes(ld.totalTime),
    servings: ld.recipeYield || '',
    difficulty,
    cost,
    ingredientsText: ld.recipeIngredient || [],
    ingredientsStructured: structuredIngredients, // [{name, qty, unit}]
    instructions: (ld.recipeInstructions || []).map(s => s.text || s),
    scrapedAt: new Date().toISOString(),
  };
}

async function main() {
  const { limit, delay } = parseArgs();
  ensureDataDir();

  console.log(`[scrape-marmiton] limite=${limit} délai=${delay}ms`);
  console.log('[scrape-marmiton] ⚠️ Usage local/recherche — vérifier les droits avant toute republication.\n');

  const urls = await collectRecipeUrls();
  const progress = loadProgress();
  const doneSet = new Set(progress.done);
  const remaining = urls.filter(u => !doneSet.has(u));

  console.log(`[scrape] ${doneSet.size} déjà faites, ${remaining.length} restantes, ${Math.min(limit, remaining.length)} ce run\n`);

  let ok = 0, failed = 0;
  const batch = remaining.slice(0, limit);

  for (const [i, url] of batch.entries()) {
    try {
      const recipe = await scrapeOne(url);
      if (recipe) {
        appendFileSync(OUTPUT_FILE, JSON.stringify(recipe) + '\n');
        ok++;
        console.log(`[${i + 1}/${batch.length}] ✓ ${recipe.name}`);
      } else {
        console.warn(`[${i + 1}/${batch.length}] ✗ Pas de JSON-LD trouvé : ${url}`);
        failed++;
      }
    } catch (err) {
      console.warn(`[${i + 1}/${batch.length}] ✗ Erreur : ${err.message}`);
      failed++;
    }
    doneSet.add(url);
    saveProgress({ done: [...doneSet] });
    await sleep(delay);
  }

  console.log(`\n[scrape-marmiton] Terminé : ${ok} récupérées, ${failed} échecs.`);
  console.log(`[scrape-marmiton] Progression totale : ${doneSet.size}/${urls.length}`);
  console.log(`[scrape-marmiton] Résultats dans ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('[scrape-marmiton] Erreur fatale:', err);
  process.exit(1);
});
