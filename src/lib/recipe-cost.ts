/**
 * Estimation du coût d'une recette
 *
 * Prix stockés en €/kg (solides), €/L (liquides), ou €/unité.
 * La quantité dans la DB est pour la recette ENTIÈRE (recipe.servings personnes).
 * Formule : coût_ingrédient = (quantité_en_kg_ou_L) × prix_unitaire
 */

// ---------------------------------------------------------------------------
// Table de prix — €/kg, €/L, ou €/unité selon le type
// "unit" : 'kg' | 'L' | 'pce' (pièce/unité)
// ---------------------------------------------------------------------------
type PriceEntry = {
  keys: string[];
  price: number;   // valeur
  unit: 'kg' | 'L' | 'pce';
};

const PRIX_FR: PriceEntry[] = [
  // ── Viandes (€/kg) ──────────────────────────────────────────────────────
  { keys: ['viande hachée', 'boeuf haché', 'bœuf haché', 'steak haché'],  price: 10,  unit: 'kg' },
  { keys: ['boeuf', 'bœuf', 'beef', 'steak', 'entrecote', 'entrecôte'],   price: 18,  unit: 'kg' },
  { keys: ['veau', 'veal'],                                                price: 20,  unit: 'kg' },
  { keys: ['agneau', 'lamb'],                                               price: 22,  unit: 'kg' },
  { keys: ['porc', 'pork', 'côte de porc', 'filet de porc'],               price: 10,  unit: 'kg' },
  { keys: ['poulet', 'chicken', 'blanc de poulet', 'escalope poulet'],     price: 9,   unit: 'kg' },
  { keys: ['dinde', 'turkey'],                                              price: 8,   unit: 'kg' },
  { keys: ['lardons', 'bacon', 'lard fumé'],                               price: 9,   unit: 'kg' },
  { keys: ['jambon', 'ham'],                                                price: 12,  unit: 'kg' },
  { keys: ['saucisse', 'saucisses', 'sausage'],                            price: 8,   unit: 'kg' },
  { keys: ['merguez'],                                                      price: 8,   unit: 'kg' },
  { keys: ['chorizo'],                                                      price: 14,  unit: 'kg' },
  // ── Poissons (€/kg) ──────────────────────────────────────────────────────
  { keys: ['saumon', 'salmon'],                                             price: 20,  unit: 'kg' },
  { keys: ['cabillaud', 'cod', 'dos de cabillaud'],                        price: 18,  unit: 'kg' },
  { keys: ['thon', 'tuna'],                                                 price: 16,  unit: 'kg' },
  { keys: ['dorade', 'sea bream'],                                          price: 17,  unit: 'kg' },
  { keys: ['bar', 'loup de mer', 'sea bass'],                              price: 22,  unit: 'kg' },
  { keys: ['sardine'],                                                      price: 6,   unit: 'kg' },
  { keys: ['crevette', 'shrimp', 'prawn'],                                 price: 18,  unit: 'kg' },
  { keys: ['moule', 'mussel'],                                              price: 4,   unit: 'kg' },
  { keys: ['calmar', 'squid'],                                              price: 12,  unit: 'kg' },
  // ── Légumes (€/kg) ───────────────────────────────────────────────────────
  { keys: ['carotte', 'carottes', 'carrot'],                               price: 1.5, unit: 'kg' },
  { keys: ['oignon', 'oignons', 'onion'],                                  price: 1.2, unit: 'kg' },
  { keys: ['échalote', 'shallot'],                                          price: 3,   unit: 'kg' },
  { keys: ['tomate', 'tomates', 'tomato'],                                 price: 2.5, unit: 'kg' },
  { keys: ['tomates cerise', 'cherry tomato'],                             price: 4,   unit: 'kg' },
  { keys: ['courgette', 'zucchini'],                                       price: 2.5, unit: 'kg' },
  { keys: ['aubergine', 'eggplant'],                                       price: 3,   unit: 'kg' },
  { keys: ['poivron', 'pepper'],                                            price: 3,   unit: 'kg' },
  { keys: ['pomme de terre', 'potato', 'patate'],                          price: 1.2, unit: 'kg' },
  { keys: ['patate douce', 'sweet potato'],                                price: 3,   unit: 'kg' },
  { keys: ['épinard', 'spinach'],                                           price: 4,   unit: 'kg' },
  { keys: ['brocoli', 'broccoli'],                                          price: 2.5, unit: 'kg' },
  { keys: ['chou-fleur', 'cauliflower'],                                   price: 2,   unit: 'kg' },
  { keys: ['chou', 'cabbage'],                                              price: 1.5, unit: 'kg' },
  { keys: ['poireau', 'leek'],                                              price: 2.5, unit: 'kg' },
  { keys: ['céleri', 'celery'],                                             price: 2,   unit: 'kg' },
  { keys: ['champignon', 'mushroom'],                                       price: 5,   unit: 'kg' },
  { keys: ['ail', 'garlic'],                                                price: 8,   unit: 'kg' },
  { keys: ['concombre', 'cucumber'],                                        price: 1.5, unit: 'kg' },
  { keys: ['salade', 'laitue', 'lettuce'],                                 price: 2,   unit: 'kg' },
  { keys: ['avocat', 'avocado'],                                            price: 4,   unit: 'kg' },
  { keys: ['maïs', 'corn'],                                                 price: 2,   unit: 'kg' },
  { keys: ['petits pois', 'peas'],                                          price: 2.5, unit: 'kg' },
  { keys: ['haricot vert', 'green bean'],                                  price: 3,   unit: 'kg' },
  { keys: ['betterave', 'beet'],                                            price: 1.5, unit: 'kg' },
  { keys: ['navet', 'turnip'],                                              price: 1.5, unit: 'kg' },
  { keys: ['fenouil', 'fennel'],                                            price: 3,   unit: 'kg' },
  { keys: ['artichaut'],                                                    price: 3,   unit: 'kg' },
  // ── Fruits (€/kg) ────────────────────────────────────────────────────────
  { keys: ['pomme', 'apple'],                                               price: 2,   unit: 'kg' },
  { keys: ['poire', 'pear'],                                                price: 2.5, unit: 'kg' },
  { keys: ['banane', 'banana'],                                             price: 1.8, unit: 'kg' },
  { keys: ['citron', 'lemon'],                                              price: 2.5, unit: 'kg' },
  { keys: ['orange'],                                                       price: 2,   unit: 'kg' },
  { keys: ['fraise', 'strawberry'],                                         price: 5,   unit: 'kg' },
  { keys: ['framboise', 'raspberry'],                                       price: 12,  unit: 'kg' },
  { keys: ['myrtille', 'blueberry'],                                        price: 10,  unit: 'kg' },
  { keys: ['raisin', 'grape'],                                              price: 3,   unit: 'kg' },
  { keys: ['mangue', 'mango'],                                              price: 5,   unit: 'kg' },
  { keys: ['ananas', 'pineapple'],                                          price: 3,   unit: 'kg' },
  // ── Féculents (€/kg) ─────────────────────────────────────────────────────
  { keys: ['riz', 'rice'],                                                  price: 1.8, unit: 'kg' },
  { keys: ['pâte', 'pasta', 'spaghetti', 'tagliatelle', 'penne', 'macaroni'], price: 1.5, unit: 'kg' },
  { keys: ['farine', 'flour'],                                              price: 0.9, unit: 'kg' },
  { keys: ['lentille', 'lentil'],                                           price: 2.5, unit: 'kg' },
  { keys: ['haricot rouge', 'kidney bean', 'haricot'],                     price: 2.5, unit: 'kg' },
  { keys: ['pois chiche', 'chickpea'],                                      price: 2.5, unit: 'kg' },
  { keys: ['quinoa'],                                                       price: 5,   unit: 'kg' },
  { keys: ['semoule', 'couscous'],                                          price: 1.5, unit: 'kg' },
  { keys: ['polenta'],                                                      price: 2,   unit: 'kg' },
  { keys: ['avoine', 'flocon', 'oat'],                                      price: 2,   unit: 'kg' },
  { keys: ['maïzena', 'amidon', 'fécule', 'cornstarch'],                   price: 2,   unit: 'kg' },
  { keys: ['chapelure', 'breadcrumb'],                                      price: 2,   unit: 'kg' },
  // ── Laitiers (€/L ou €/pce) ──────────────────────────────────────────────
  { keys: ['lait', 'milk'],                                                 price: 0.95,unit: 'L'  },
  { keys: ['crème fraîche', 'crème épaisse', 'sour cream'],                price: 3.5, unit: 'L'  },
  { keys: ['crème liquide', 'crème fleurette', 'crème', 'cream'],          price: 2.5, unit: 'L'  },
  { keys: ['beurre', 'butter'],                                             price: 9,   unit: 'kg' },
  { keys: ['gruyère', 'emmental'],                                          price: 9,   unit: 'kg' },
  { keys: ['parmesan'],                                                     price: 16,  unit: 'kg' },
  { keys: ['mozzarella'],                                                   price: 10,  unit: 'kg' },
  { keys: ['comté'],                                                        price: 15,  unit: 'kg' },
  { keys: ['camembert', 'brie', 'fromage'],                                price: 10,  unit: 'kg' },
  { keys: ['ricotta'],                                                      price: 8,   unit: 'kg' },
  { keys: ['mascarpone'],                                                   price: 10,  unit: 'kg' },
  { keys: ['yaourt', 'yogurt'],                                             price: 2,   unit: 'kg' },
  { keys: ['oeuf', 'oeufs', 'egg'],                                        price: 0.28,unit: 'pce'},
  // ── Huiles & condiments (€/L ou €/kg) ────────────────────────────────────
  { keys: ['huile d\'olive', 'olive oil'],                                  price: 8,   unit: 'L'  },
  { keys: ['huile', 'oil'],                                                 price: 2.5, unit: 'L'  },
  { keys: ['vinaigre', 'vinegar'],                                          price: 1.5, unit: 'L'  },
  { keys: ['sauce soja', 'soy sauce'],                                      price: 5,   unit: 'L'  },
  { keys: ['miel', 'honey'],                                                price: 8,   unit: 'kg' },
  { keys: ['sucre', 'sugar'],                                               price: 1.2, unit: 'kg' },
  { keys: ['sel', 'salt'],                                                  price: 0.5, unit: 'kg' },
  { keys: ['poivre', 'pepper spice'],                                       price: 20,  unit: 'kg' },
  { keys: ['moutarde', 'mustard'],                                          price: 4,   unit: 'kg' },
  { keys: ['ketchup'],                                                      price: 2.5, unit: 'kg' },
  { keys: ['concentré de tomate', 'tomato paste', 'purée de tomate'],      price: 3,   unit: 'kg' },
  { keys: ['coulis de tomate', 'sauce tomate', 'pulpe'],                   price: 2,   unit: 'kg' },
  { keys: ['tomates pelées', 'tomates concassées'],                        price: 1.8, unit: 'kg' },
  { keys: ['curry'],                                                        price: 12,  unit: 'kg' },
  { keys: ['curcuma', 'turmeric'],                                          price: 10,  unit: 'kg' },
  { keys: ['cumin'],                                                        price: 10,  unit: 'kg' },
  { keys: ['paprika'],                                                      price: 10,  unit: 'kg' },
  { keys: ['cannelle', 'cinnamon'],                                         price: 12,  unit: 'kg' },
  { keys: ['gingembre', 'ginger'],                                          price: 6,   unit: 'kg' },
  { keys: ['piment', 'chili', 'chile'],                                    price: 10,  unit: 'kg' },
  { keys: ['thym', 'romarin', 'laurier', 'herbe', 'herb'],                 price: 8,   unit: 'kg' },
  { keys: ['basilic', 'basil'],                                             price: 12,  unit: 'kg' },
  { keys: ['persil', 'coriandre', 'ciboulette'],                           price: 10,  unit: 'kg' },
  { keys: ['levure', 'yeast'],                                              price: 5,   unit: 'kg' },
  { keys: ['levure chimique', 'baking powder'],                            price: 4,   unit: 'kg' },
  { keys: ['bouillon', 'stock', 'broth'],                                   price: 8,   unit: 'kg' },
  // ── Conserves & divers (€/kg) ─────────────────────────────────────────────
  { keys: ['haricot en boite', 'haricot rouge boite'],                     price: 2.5, unit: 'kg' },
  { keys: ['maïs en boite'],                                               price: 2,   unit: 'kg' },
  { keys: ['pain', 'bread'],                                                price: 3.5, unit: 'kg' },
  { keys: ['noix', 'walnut'],                                               price: 15,  unit: 'kg' },
  { keys: ['amande', 'almond'],                                             price: 14,  unit: 'kg' },
  { keys: ['noisette', 'hazelnut'],                                         price: 15,  unit: 'kg' },
  { keys: ['cacahuète', 'peanut'],                                          price: 5,   unit: 'kg' },
  { keys: ['chocolat', 'chocolate'],                                        price: 8,   unit: 'kg' },
  { keys: ['cacao', 'cocoa'],                                               price: 12,  unit: 'kg' },
  { keys: ['vin', 'wine'],                                                  price: 4,   unit: 'L'  },
  { keys: ['bière', 'beer'],                                                price: 2,   unit: 'L'  },
  { keys: ['tofu'],                                                         price: 8,   unit: 'kg' },
];

// ---------------------------------------------------------------------------
// Normalisation (minuscules + sans accents)
// ---------------------------------------------------------------------------
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------------------------------------------------------------------------
// Matching flou : recherche la meilleure clé dans la table
// Tri décroissant par longueur de clé → les termes précis matchent en premier
// ---------------------------------------------------------------------------
function lookupEntry(ingredientName: string): PriceEntry | null {
  const n = norm(ingredientName);
  const sorted = [...PRIX_FR].sort(
    (a, b) => Math.max(...b.keys.map(k => k.length)) - Math.max(...a.keys.map(k => k.length))
  );
  for (const entry of sorted) {
    for (const key of entry.keys) {
      const k = norm(key);
      if (n.includes(k) || k.includes(n.split(' ')[0])) return entry;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Conversion d'unité → kg ou L (selon le type de prix)
// ---------------------------------------------------------------------------
function toBaseUnit(qty: number, unit: string): { value: number; base: 'kg' | 'L' | 'pce' } {
  const u = unit.toLowerCase().trim();

  // Masse → kg
  if (['g', 'gr', 'gramme', 'grammes', 'gram'].includes(u))
    return { value: qty / 1000, base: 'kg' };
  if (['kg', 'kilogramme', 'kilogrammes'].includes(u))
    return { value: qty, base: 'kg' };

  // Volume → L
  if (['ml', 'millilitre', 'millilitres'].includes(u))
    return { value: qty / 1000, base: 'L' };
  if (['cl', 'centilitre'].includes(u))
    return { value: qty / 100, base: 'L' };
  if (['dl', 'décilitre'].includes(u))
    return { value: qty / 10, base: 'L' };
  if (['l', 'litre', 'litres'].includes(u))
    return { value: qty, base: 'L' };

  // Pièces / unités
  return { value: qty, base: 'pce' };
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
export interface CostEstimate {
  total: number;
  perServing: number;
  currency: string;
  confidence: 'high' | 'medium' | 'low';
  missingCount: number;
  breakdown: Array<{
    name: string;
    emoji: string;
    price: number;
    source: 'table' | 'unknown';
  }>;
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------
export function estimateRecipeCost(
  ingredients: Array<{ name: string; emoji: string; quantity: number; unit: string }>,
  servings: number,
): CostEstimate {
  let total = 0;
  let missingCount = 0;

  const breakdown = ingredients.map(ing => {
    const entry = lookupEntry(ing.name);
    if (!entry) {
      missingCount++;
      return { name: ing.name, emoji: ing.emoji, price: 0, source: 'unknown' as const };
    }

    const { value, base } = toBaseUnit(ing.quantity, ing.unit);

    let linePrice: number;

    if (entry.unit === 'kg' && base === 'kg') {
      linePrice = value * entry.price;
    } else if (entry.unit === 'L' && base === 'L') {
      linePrice = value * entry.price;
    } else if (entry.unit === 'pce' && base === 'pce') {
      linePrice = value * entry.price;
    } else if (entry.unit === 'kg' && base === 'L') {
      // Ex : lait stocké en kg → on assimile 1L ≈ 1kg
      linePrice = value * entry.price;
    } else if (entry.unit === 'L' && base === 'kg') {
      linePrice = value * entry.price;
    } else {
      // Unité inconnue : estimation par portion ×0.5
      linePrice = entry.price * 0.5;
    }

    // Épices / condiments : cap à 1€ par usage (on n'achète pas 500g de cumin)
    const isSpice = ['kg', 'L'].includes(entry.unit) && entry.price >= 8 && value < 0.05;
    if (isSpice) linePrice = Math.min(linePrice, 0.80);

    linePrice = Math.max(0, parseFloat(linePrice.toFixed(2)));
    total += linePrice;
    return { name: ing.name, emoji: ing.emoji, price: linePrice, source: 'table' as const };
  });

  total = parseFloat(total.toFixed(2));
  const perServing = parseFloat((total / Math.max(servings, 1)).toFixed(2));

  const known = ingredients.length - missingCount;
  const coverage = ingredients.length > 0 ? known / ingredients.length : 0;
  const confidence: CostEstimate['confidence'] =
    coverage >= 0.75 ? 'high' : coverage >= 0.5 ? 'medium' : 'low';

  return { total, perServing, currency: 'EUR', breakdown, missingCount, confidence };
}
