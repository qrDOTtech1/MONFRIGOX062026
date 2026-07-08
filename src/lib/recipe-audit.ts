// ============================================================================
// Audit qualité des recettes — logique pure, réutilisable.
//  - Phase 1 : scan de toutes les recettes existantes (page admin /audit).
//  - Phase 3 : ré-inspection automatique à l'import / génération IA.
// Aucune dépendance à Prisma ici : on prend un objet simple en entrée pour
// pouvoir l'appeler côté serveur comme côté script.
// ============================================================================

export type FlagSeverity = 'high' | 'medium' | 'low';

export interface AuditFlag {
  code: string;          // identifiant machine, ex: 'steps-single-block'
  label: string;         // libellé lisible en français
  severity: FlagSeverity;
  detail?: string;       // précision (ex: le nom d'ingrédient fautif)
}

export interface RecipeAuditInput {
  name: string;
  description: string;
  instructions: string;
  cuisine: string;
  prepTime: number;
  servings: number;
  difficulty?: string | null;
  externalSrc?: string | null;
  authorId?: string | null;
  isRevisite?: boolean | null;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
}

export interface RecipeAuditResult {
  score: number;               // 0 (catastrophe) → 100 (nickel)
  flags: AuditFlag[];
  source: 'seed' | 'mealdb' | 'marmiton' | 'ia' | 'communaute' | 'inconnu';
}

// --- Détection "texte anglais" (reste d'import MealDB non traduit) -----------
const ACCENTS = /[àâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ]/;
const EN_WORDS = /\b(the|and|with|then|until|into|add|stir|heat|bake|pour|minutes|remove|cook|serve|season|chopped|sliced|preheat)\b/gi;

function looksEnglish(text: string): boolean {
  if (!text) return false;
  const matches = text.match(EN_WORDS);
  const enHits = matches ? matches.length : 0;
  const accentHits = (text.match(new RegExp(ACCENTS, 'g')) || []).length;
  // Beaucoup de mots anglais + très peu d'accents français = probablement anglais.
  return enHits >= 3 && accentHits <= 1;
}

// --- Découpage des étapes (miroir de parseSteps côté /cook et /[id]) ---------
// On veut détecter si le texte se découpe correctement en plusieurs étapes.
export function splitSteps(raw: string): string[] {
  const text = (raw || '').trim();
  if (!text) return [];

  let parts = text.split(/\r?\n|\\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  parts = text
    .split(/(?=(?:\d+[.)]\s)|(?:étape\s*\d+\s*[:.\-]?\s))/i)
    .map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  parts = text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖÀ-Ý])/)
    .map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  return [text];
}

// --- Détection d'un nom d'ingrédient douteux --------------------------------
const EN_FOOD = /\b(chicken|beef|pork|sugar|salt|flour|water|onion|garlic|butter|oil|egg|eggs|milk|cheese|pepper|rice|beans|tomato|potato|carrot|chopped|sliced|fresh|ground)\b/i;

function ingredientNameIssue(name: string): string | null {
  const n = (name || '').trim();
  if (!n) return 'nom vide';
  if (/\d/.test(n)) return 'contient un chiffre (mesure collée au nom ?)';
  if (n.length > 40) return 'nom anormalement long (phrase entière ?)';
  if (/[<>{}]|&nbsp;|https?:\/\//i.test(n)) return 'contient un artefact (HTML / URL)';
  if (n === n.toUpperCase() && /[A-Z]/.test(n) && n.length > 3) return 'tout en majuscules';
  if (EN_FOOD.test(n) && !ACCENTS.test(n)) return 'nom en anglais (import non traduit ?)';
  return null;
}

function classifySource(r: RecipeAuditInput): RecipeAuditResult['source'] {
  const src = (r.externalSrc || '').toLowerCase();
  if (src.includes('mealdb')) return 'mealdb';
  if (src.includes('marmiton')) return 'marmiton';
  if (r.isRevisite) return 'ia';
  if (r.authorId) return 'communaute';
  if (!src && !r.authorId && !r.isRevisite) return 'seed';
  return 'inconnu';
}

const PENALTY: Record<FlagSeverity, number> = { high: 30, medium: 15, low: 6 };

export function auditRecipe(r: RecipeAuditInput): RecipeAuditResult {
  const flags: AuditFlag[] = [];
  const push = (code: string, label: string, severity: FlagSeverity, detail?: string) =>
    flags.push({ code, label, severity, detail });

  // ---- ÉTAPES / INSTRUCTIONS ----
  const instr = (r.instructions || '').trim();
  if (!instr) {
    push('steps-empty', 'Aucune instruction', 'high');
  } else {
    const steps = splitSteps(instr);
    if (steps.length <= 1 && instr.length > 200) {
      push('steps-single-block', 'Étapes non découpées (un seul bloc)', 'high',
        `${instr.length} caractères sans séparation`);
    } else if (steps.length < 2) {
      push('steps-too-few', 'Moins de 2 étapes', 'medium', `${steps.length} étape(s)`);
    }
    if (steps.some(s => s.length < 10)) {
      push('steps-tiny', 'Étape(s) trop courte(s)', 'low');
    }
    if (/<[a-z/]|&nbsp;|&amp;|&#\d+;/i.test(instr)) {
      push('steps-html', 'Artefact HTML dans les étapes', 'medium');
    }
    if (/\b(\d+)\.\s+\1\.|\bstep\s*\d+\b/i.test(instr)) {
      push('steps-artifact', 'Numérotation en double / marqueur "Step"', 'low');
    }
    if (looksEnglish(instr)) {
      push('steps-english', 'Instructions en anglais', 'high');
    }
  }

  // ---- INGRÉDIENTS ----
  if (r.ingredients.length === 0) {
    push('ing-none', 'Aucun ingrédient', 'high');
  } else if (r.ingredients.length < 2) {
    push('ing-few', 'Un seul ingrédient', 'medium');
  }
  for (const ing of r.ingredients) {
    const issue = ingredientNameIssue(ing.name);
    if (issue) push('ing-name', `Ingrédient mal nommé : "${ing.name}"`, 'high', issue);
    if (!(ing.quantity > 0)) push('ing-qty', `Quantité nulle : "${ing.name}"`, 'low');
    if (!ing.unit?.trim()) push('ing-unit', `Unité manquante : "${ing.name}"`, 'low');
  }

  // ---- FICHE ----
  if (!r.description?.trim()) push('no-desc', 'Description vide', 'medium');
  else if (looksEnglish(r.description)) push('desc-english', 'Description en anglais', 'medium');
  if (!r.cuisine?.trim()) push('no-cuisine', 'Cuisine non renseignée', 'low');
  if (!(r.prepTime > 0)) push('no-preptime', 'Temps de préparation à 0', 'low');
  if (!(r.servings > 0)) push('no-servings', 'Nombre de portions à 0', 'low');
  if (!r.difficulty) push('no-difficulty', 'Difficulté manquante', 'low');
  if (looksEnglish(r.name)) push('name-english', 'Titre en anglais', 'medium');

  const penalty = flags.reduce((sum, f) => sum + PENALTY[f.severity], 0);
  const score = Math.max(0, 100 - penalty);

  return { score, flags, source: classifySource(r) };
}
