/**
 * Analyse diététique des recettes — détection allergènes & compatibilité régime.
 *
 * Approche par mots-clés sur les noms d'ingrédients (français).
 * Gratuit, instantané, sans appel IA. Best-effort : à confirmer par l'utilisateur.
 */

// --- Allergènes (14 allergènes à déclaration obligatoire UE) ---
// key = clé utilisée dans le profil (cf. ALLERGENS dans profile/page.tsx)
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: ['blé', 'ble', 'farine', 'pain', 'pâtes', 'pates', 'pâte', 'pate', 'semoule', 'orge', 'seigle', 'avoine', 'épeautre', 'epeautre', 'boulgour', 'chapelure', 'couscous', 'biscuit', 'gâteau', 'gateau', 'brioche', 'spaghetti', 'macaroni', 'nouilles', 'tortilla', 'pizza', 'lasagne', 'malt'],
  lactose: ['lait', 'fromage', 'beurre', 'crème', 'creme', 'yaourt', 'yogourt', 'mozzarella', 'parmesan', 'ricotta', 'mascarpone', 'gruyère', 'gruyere', 'cheddar', 'feta', 'emmental', 'comté', 'comte', 'camembert', 'chèvre', 'chevre', 'fromage blanc'],
  arachides: ['arachide', 'cacahuète', 'cacahuete', 'cacahouète', 'beurre de cacahuète'],
  'fruits-a-coque': ['amande', 'noix', 'noisette', 'pistache', 'cajou', 'pécan', 'pecan', 'macadamia', 'pignon', 'noix de cajou', 'noix de pécan'],
  oeufs: ['oeuf', 'œuf', 'oeufs', 'œufs', 'jaune d\'oeuf', 'blanc d\'oeuf', 'mayonnaise', 'meringue'],
  poisson: ['poisson', 'saumon', 'thon', 'cabillaud', 'morue', 'sardine', 'maquereau', 'truite', 'anchois', 'bar', 'dorade', 'sole', 'colin', 'lieu', 'hareng', 'merlu', 'églefin', 'eglefin'],
  crustaces: ['crevette', 'crabe', 'homard', 'langoustine', 'gambas', 'écrevisse', 'ecrevisse', 'langouste', 'tourteau'],
  soja: ['soja', 'tofu', 'edamame', 'sauce soja', 'tempeh', 'miso'],
  celeri: ['céleri', 'celeri'],
  moutarde: ['moutarde'],
  sesame: ['sésame', 'sesame', 'tahini', 'tahin'],
  sulfites: ['vin', 'vinaigre', 'fruits secs', 'abricot sec', 'raisin sec'],
  lupin: ['lupin'],
  mollusques: ['moule', 'huître', 'huitre', 'calamar', 'calmar', 'poulpe', 'seiche', 'escargot', 'palourde', 'coquille saint-jacques', 'saint-jacques', 'bulot', 'bigorneau'],
};

// --- Incompatibilités de régime ---
const MEAT = ['viande', 'boeuf', 'bœuf', 'porc', 'poulet', 'agneau', 'veau', 'jambon', 'lardon', 'bacon', 'saucisse', 'saucisson', 'charcuterie', 'chorizo', 'dinde', 'canard', 'lapin', 'gigot', 'steak', 'merguez', 'gélatine', 'gelatine', 'foie gras', 'pâté', 'pate'];
const FISH_SEAFOOD = ['poisson', 'saumon', 'thon', 'cabillaud', 'morue', 'sardine', 'maquereau', 'truite', 'anchois', 'crevette', 'crabe', 'homard', 'fruits de mer', 'moule', 'huître', 'huitre', 'calamar', 'poulpe', 'gambas'];
const DAIRY_EGG = ['lait', 'fromage', 'beurre', 'crème', 'creme', 'yaourt', 'œuf', 'oeuf', 'miel', 'mozzarella', 'parmesan'];
const PORK = ['porc', 'jambon', 'lardon', 'bacon', 'saucisson', 'chorizo', 'cochon', 'saindoux', 'rillette'];
const ALCOHOL = ['vin', 'bière', 'biere', 'rhum', 'cognac', 'whisky', 'vodka', 'liqueur', 'champagne', 'porto', 'martini'];
const SUGAR = ['sucre', 'miel', 'sirop', 'confiture', 'chocolat', 'bonbon', 'caramel', 'nutella', 'pâte à tartiner'];

const DIET_FORBIDDEN: Record<string, string[]> = {
  vegetarien: [...MEAT, ...FISH_SEAFOOD],
  vegan: [...MEAT, ...FISH_SEAFOOD, ...DAIRY_EGG],
  halal: [...PORK, ...ALCOHOL],
  'sans-porc': PORK,
  casher: [...PORK, ...FISH_SEAFOOD.filter(f => ['crevette', 'crabe', 'homard', 'fruits de mer', 'moule', 'huître', 'huitre', 'calamar', 'poulpe', 'gambas'].includes(f))],
  'sans-sucre': SUGAR,
  // keto : basé sur les glucides, géré séparément (pas par mots-clés)
};

const DIET_LABELS: Record<string, string> = {
  vegetarien: 'végétarien',
  vegan: 'vegan',
  halal: 'halal',
  'sans-porc': 'sans porc',
  casher: 'casher',
  'sans-sucre': 'sans sucre',
  keto: 'keto',
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function matchesAny(ingredientNames: string[], keywords: string[]): string[] {
  const matched: string[] = [];
  const names = ingredientNames.map(normalize);
  for (const name of names) {
    for (const kw of keywords) {
      if (name.includes(kw)) {
        matched.push(name);
        break;
      }
    }
  }
  return [...new Set(matched)];
}

export interface DietaryAnalysis {
  /** Allergènes détectés parmi ceux que l'utilisateur a déclarés (clés) */
  allergenWarnings: string[];
  /** true si la recette est incompatible avec le régime de l'utilisateur */
  dietConflict: boolean;
  /** Libellé du régime en conflit (ex: "vegan") */
  dietLabel: string;
  /** Noms d'ingrédients qui posent problème pour le régime */
  dietConflictIngredients: string[];
}

/**
 * Analyse une recette contre les préférences de l'utilisateur.
 * @param ingredientNames noms des ingrédients de la recette
 * @param userAllergens clés des allergènes déclarés par l'utilisateur
 * @param dietMode régime de l'utilisateur ("vegan", "halal", ...)
 * @param carbs glucides par portion (pour keto)
 */
export function analyzeRecipeDietary(
  ingredientNames: string[],
  userAllergens: string[],
  dietMode: string,
  carbs?: number | null,
): DietaryAnalysis {
  // Allergènes
  const allergenWarnings: string[] = [];
  for (const allergenKey of userAllergens) {
    const keywords = ALLERGEN_KEYWORDS[allergenKey];
    if (keywords && matchesAny(ingredientNames, keywords).length > 0) {
      allergenWarnings.push(allergenKey);
    }
  }

  // Régime
  let dietConflict = false;
  let dietConflictIngredients: string[] = [];
  if (dietMode === 'keto') {
    // Keto : conflit si > 25g de glucides par portion
    if (typeof carbs === 'number' && carbs > 25) dietConflict = true;
  } else if (dietMode && DIET_FORBIDDEN[dietMode]) {
    dietConflictIngredients = matchesAny(ingredientNames, DIET_FORBIDDEN[dietMode]);
    dietConflict = dietConflictIngredients.length > 0;
  }

  return {
    allergenWarnings,
    dietConflict,
    dietLabel: DIET_LABELS[dietMode] || '',
    dietConflictIngredients,
  };
}

/** Libellés lisibles des allergènes (pour affichage) */
export const ALLERGEN_LABELS: Record<string, string> = {
  gluten: 'Gluten',
  lactose: 'Lactose',
  arachides: 'Arachides',
  'fruits-a-coque': 'Fruits à coque',
  oeufs: 'Œufs',
  poisson: 'Poisson',
  crustaces: 'Crustacés',
  soja: 'Soja',
  celeri: 'Céleri',
  moutarde: 'Moutarde',
  sesame: 'Sésame',
  sulfites: 'Sulfites',
  lupin: 'Lupin',
  mollusques: 'Mollusques',
};
