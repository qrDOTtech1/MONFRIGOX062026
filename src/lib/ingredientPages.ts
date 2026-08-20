import { prisma } from './db';

/**
 * Pages de longue traîne « Que faire avec … ».
 *
 * Le catalogue contient des milliers de recettes reliées à leurs ingrédients :
 * de quoi produire des centaines de pages qui répondent à une vraie question
 * (« que faire avec des aubergines ? ») plutôt que de viser un mot générique
 * comme « recette », déjà tenu par des sites vieux de vingt ans.
 *
 * Chaque page n'existe QUE si elle a de quoi être utile : au moins
 * MIN_RECIPES recettes réelles derrière. Une page vide est une page qui nuit.
 */

export const MIN_RECIPES = 6;
export const MAX_PAGES = 300;

/**
 * Ingrédients écartés : personne ne cherche « que faire avec du sel ».
 *
 * Le classement se fait par nombre de recettes, ce qui fait remonter en tête
 * les assaisonnements et les produits de base — présents partout, cherchés
 * jamais. Ces pages gaspillent du budget de crawl et donnent au site un air
 * de ferme à contenu. On ne garde que ce qu'on peut avoir EN TROP dans son
 * frigo, ce qui colle au positionnement anti-gaspi.
 */
const EXCLUS = new Set([
  'sel', 'poivre', 'sel-et-poivre', 'sel-fin', 'gros-sel', 'fleur-de-sel',
  'eau', 'eau-froide', 'eau-chaude', 'glacons', 'glace',
  'sucre', 'sucre-en-poudre', 'sucre-glace', 'sucre-roux', 'cassonade',
  'farine', 'farine-de-ble', 'levure', 'levure-chimique', 'levure-de-boulanger',
  'huile', 'huile-d-olive', 'huile-de-tournesol', 'huile-vegetale',
  'vinaigre', 'vinaigre-balsamique', 'vinaigre-de-vin',
  'beurre', 'beurre-doux', 'beurre-sale', 'margarine',
  'bouillon', 'bouillon-cube', 'cube-de-bouillon',
  'epices', 'herbes', 'herbes-de-provence', 'assaisonnement',
  'colorant', 'arome', 'extrait-de-vanille',
]);

/** Termes qui trahissent un produit de base plutôt qu'un aliment du frigo. */
const MOTIF_EXCLU = /^(sel|poivre|sucre|farine|huile|vinaigre|eau|levure|bouillon|epice)/;

/** « Pomme de terre » → « pomme-de-terre ». */
export function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // enlève les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface IngredientPage {
  slug: string;
  name: string;
  emoji: string;
  category: string;
  recipeCount: number;
}

/** Ingrédients suffisamment présents pour mériter leur page. */
export async function listIngredientPages(): Promise<IngredientPage[]> {
  const rows = await prisma.ingredient.findMany({
    select: {
      name: true, emoji: true, category: true,
      _count: { select: { recipeIngredients: true } },
    },
    orderBy: { recipeIngredients: { _count: 'desc' } },
    take: MAX_PAGES * 2,
  });

  const seen = new Set<string>();
  const pages: IngredientPage[] = [];
  for (const r of rows) {
    if (r._count.recipeIngredients < MIN_RECIPES) continue;
    const slug = toSlug(r.name);
    if (EXCLUS.has(slug) || MOTIF_EXCLU.test(slug)) continue;
    // Deux ingrédients peuvent donner le même slug (« Œuf » / « Oeuf ») :
    // on garde le plus fourni, arrivé en premier grâce au tri.
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    pages.push({
      slug,
      name: r.name,
      emoji: r.emoji || '🥘',
      category: r.category || '',
      recipeCount: r._count.recipeIngredients,
    });
    if (pages.length >= MAX_PAGES) break;
  }
  return pages;
}

export interface IngredientPageData extends IngredientPage {
  recipes: Array<{
    id: string;
    name: string;
    description: string;
    prepTime: number;
    difficulty: string;
    imageUrl: string;
    calories: number | null;
    ingredientCount: number;
  }>;
  related: IngredientPage[];
}

/** Contenu complet d'une page, ou null si l'ingrédient n'en mérite pas une. */
export async function getIngredientPage(slug: string): Promise<IngredientPageData | null> {
  const all = await listIngredientPages();
  const page = all.find(p => p.slug === slug);
  if (!page) return null;

  const rows = await prisma.recipeIngredient.findMany({
    where: { ingredient: { name: page.name } },
    select: {
      recipe: {
        select: {
          id: true, name: true, description: true, prepTime: true,
          difficulty: true, imageUrl: true, calories: true, isPublic: true,
          authorId: true,
          _count: { select: { ingredients: true } },
        },
      },
    },
    take: 60,
  });

  const recipes = rows
    .map(r => r.recipe)
    // Les recettes communautaires privées n'ont rien à faire sur une page publique
    .filter(r => r && (!r.authorId || r.isPublic))
    .filter(r => (r.name || '').trim().length > 4)
    .slice(0, 24)
    .map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      prepTime: r.prepTime,
      difficulty: r.difficulty,
      imageUrl: r.imageUrl || '',
      calories: r.calories,
      ingredientCount: r._count.ingredients,
    }));

  // Suggestions : même catégorie, pour créer un maillage interne réel
  const related = all
    .filter(p => p.slug !== slug && p.category === page.category)
    .slice(0, 8);

  return { ...page, recipes, related };
}
