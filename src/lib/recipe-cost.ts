/**
 * Estimation du coût d'une recette
 *
 * Sources :
 *  1. Open Food Facts search (gratuit, illimité) — prix unitaire si disponible
 *  2. Table de prix moyens France (supermarché) en fallback
 *
 * Prix = coût pour 1 portion, en €
 */

// ---------------------------------------------------------------------------
// Table de prix moyens France par ingrédient (~supermarché mid-range)
// Clé = mots-clés en minuscules, valeur = €/portion estimée
// ---------------------------------------------------------------------------
const PRIX_FR: Array<{ keys: string[]; price: number }> = [
  // ── Légumes ──
  { keys: ['carotte', 'carottes'],                   price: 0.20 },
  { keys: ['oignon', 'oignons'],                     price: 0.15 },
  { keys: ['échalote', 'shallot'],                   price: 0.20 },
  { keys: ['tomate', 'tomates'],                     price: 0.35 },
  { keys: ['tomates cerise', 'cherry'],              price: 0.45 },
  { keys: ['courgette', 'zucchini'],                 price: 0.40 },
  { keys: ['aubergine'],                             price: 0.50 },
  { keys: ['poivron', 'pepper'],                     price: 0.45 },
  { keys: ['pomme de terre', 'potato', 'patate'],    price: 0.18 },
  { keys: ['patate douce', 'sweet potato'],          price: 0.45 },
  { keys: ['épinard', 'spinach'],                    price: 0.30 },
  { keys: ['brocoli', 'broccoli'],                   price: 0.40 },
  { keys: ['chou-fleur', 'cauliflower'],             price: 0.45 },
  { keys: ['chou', 'cabbage'],                       price: 0.25 },
  { keys: ['poireau', 'leek'],                       price: 0.35 },
  { keys: ['céleri', 'celery'],                      price: 0.30 },
  { keys: ['champignon', 'mushroom'],                price: 0.50 },
  { keys: ['ail', 'garlic'],                         price: 0.10 },
  { keys: ['concombre', 'cucumber'],                 price: 0.35 },
  { keys: ['salade', 'laitue', 'lettuce'],           price: 0.40 },
  { keys: ['avocat', 'avocado'],                     price: 0.65 },
  { keys: ['maïs', 'corn'],                          price: 0.30 },
  { keys: ['petits pois', 'peas'],                   price: 0.25 },
  { keys: ['artichaut'],                             price: 0.70 },
  { keys: ['fenouil', 'fennel'],                     price: 0.50 },
  { keys: ['betterave', 'beet'],                     price: 0.30 },
  { keys: ['radis'],                                 price: 0.25 },
  { keys: ['navet', 'turnip'],                       price: 0.20 },
  { keys: ['bette', 'chard'],                        price: 0.30 },
  // ── Fruits ──
  { keys: ['pomme', 'apple'],                        price: 0.25 },
  { keys: ['poire', 'pear'],                         price: 0.30 },
  { keys: ['banane', 'banana'],                      price: 0.20 },
  { keys: ['citron', 'lemon'],                       price: 0.25 },
  { keys: ['orange'],                                price: 0.30 },
  { keys: ['fraise', 'strawberry'],                  price: 0.55 },
  { keys: ['framboise', 'raspberry'],                price: 0.70 },
  { keys: ['myrtille', 'blueberry'],                 price: 0.75 },
  { keys: ['cerise', 'cherry fruit'],                price: 0.65 },
  { keys: ['pêche', 'peach'],                        price: 0.45 },
  { keys: ['abricot'],                               price: 0.40 },
  { keys: ['raisin', 'grape'],                       price: 0.50 },
  { keys: ['ananas', 'pineapple'],                   price: 0.60 },
  { keys: ['mangue', 'mango'],                       price: 0.75 },
  // ── Viandes ──
  { keys: ['poulet', 'chicken'],                     price: 1.20 },
  { keys: ['dinde', 'turkey'],                       price: 1.10 },
  { keys: ['boeuf', 'beef', 'steak', 'viande hachée', 'ground beef'], price: 2.50 },
  { keys: ['porc', 'pork', 'côte de porc'],          price: 1.80 },
  { keys: ['agneau', 'lamb'],                        price: 3.00 },
  { keys: ['veau', 'veal'],                          price: 2.80 },
  { keys: ['lardons', 'bacon', 'lard'],              price: 0.80 },
  { keys: ['jambon', 'ham'],                         price: 0.70 },
  { keys: ['saucisse', 'sausage'],                   price: 0.90 },
  { keys: ['merguez'],                               price: 0.80 },
  { keys: ['chorizo'],                               price: 0.70 },
  // ── Poissons & fruits de mer ──
  { keys: ['saumon', 'salmon'],                      price: 2.80 },
  { keys: ['cabillaud', 'cod'],                      price: 2.50 },
  { keys: ['thon', 'tuna'],                          price: 0.80 },
  { keys: ['dorade', 'sea bream'],                   price: 2.60 },
  { keys: ['bar', 'loup de mer', 'sea bass'],        price: 3.00 },
  { keys: ['sardine'],                               price: 0.60 },
  { keys: ['crevette', 'shrimp', 'prawn'],           price: 2.00 },
  { keys: ['moule', 'mussel'],                       price: 1.00 },
  { keys: ['calmar', 'squid'],                       price: 1.50 },
  // ── Féculents ──
  { keys: ['riz', 'rice'],                           price: 0.20 },
  { keys: ['pâte', 'pasta', 'spaghetti', 'tagliatelle', 'penne'], price: 0.25 },
  { keys: ['farine', 'flour'],                       price: 0.15 },
  { keys: ['pain', 'bread'],                         price: 0.35 },
  { keys: ['lentille', 'lentil'],                    price: 0.30 },
  { keys: ['haricot', 'bean'],                       price: 0.30 },
  { keys: ['pois chiche', 'chickpea'],               price: 0.30 },
  { keys: ['quinoa'],                                price: 0.50 },
  { keys: ['semoule', 'couscous'],                   price: 0.25 },
  { keys: ['polenta'],                               price: 0.25 },
  { keys: ['avoine', 'oat'],                         price: 0.20 },
  { keys: ['maïzena', 'amidon', 'cornstarch'],       price: 0.10 },
  // ── Laitiers & oeufs ──
  { keys: ['oeuf', 'egg', 'oeufs'],                  price: 0.25 },
  { keys: ['beurre', 'butter'],                      price: 0.40 },
  { keys: ['lait', 'milk'],                          price: 0.30 },
  { keys: ['crème', 'cream'],                        price: 0.50 },
  { keys: ['yaourt', 'yogurt', 'yoghurt'],           price: 0.35 },
  { keys: ['fromage', 'cheese'],                     price: 0.80 },
  { keys: ['gruyère', 'emmental'],                   price: 0.60 },
  { keys: ['parmesan'],                              price: 0.90 },
  { keys: ['mozzarella'],                            price: 0.70 },
  { keys: ['comté'],                                 price: 0.80 },
  { keys: ['camembert', 'brie'],                     price: 0.90 },
  { keys: ['ricotta'],                               price: 0.60 },
  { keys: ['mascarpone'],                            price: 0.70 },
  { keys: ['crème fraîche', 'sour cream'],           price: 0.45 },
  // ── Condiments & épices ──
  { keys: ['huile', 'oil', 'olive'],                 price: 0.15 },
  { keys: ['sel', 'salt'],                           price: 0.02 },
  { keys: ['poivre', 'pepper spice'],                price: 0.05 },
  { keys: ['sucre', 'sugar'],                        price: 0.10 },
  { keys: ['miel', 'honey'],                         price: 0.30 },
  { keys: ['vinaigre', 'vinegar'],                   price: 0.10 },
  { keys: ['moutarde', 'mustard'],                   price: 0.15 },
  { keys: ['ketchup'],                               price: 0.15 },
  { keys: ['sauce soja', 'soy sauce'],               price: 0.15 },
  { keys: ['curry'],                                 price: 0.10 },
  { keys: ['curcuma', 'turmeric'],                   price: 0.08 },
  { keys: ['cumin'],                                 price: 0.08 },
  { keys: ['paprika'],                               price: 0.08 },
  { keys: ['herbe', 'thym', 'romarin', 'basilic', 'persil', 'coriandre', 'herb'], price: 0.10 },
  { keys: ['cannelle', 'cinnamon'],                  price: 0.08 },
  { keys: ['gingembre', 'ginger'],                   price: 0.15 },
  { keys: ['bouillon', 'stock', 'broth'],            price: 0.20 },
  { keys: ['concentré de tomate', 'tomato paste'],   price: 0.15 },
  { keys: ['coulis de tomate'],                      price: 0.30 },
  { keys: ['levure', 'yeast'],                       price: 0.10 },
  // ── Divers ──
  { keys: ['noix', 'walnut', 'nuts'],                price: 0.40 },
  { keys: ['amande', 'almond'],                      price: 0.45 },
  { keys: ['noisette', 'hazelnut'],                  price: 0.40 },
  { keys: ['cacahuète', 'peanut'],                   price: 0.25 },
  { keys: ['chocolat', 'chocolate'],                 price: 0.50 },
  { keys: ['cacao', 'cocoa'],                        price: 0.20 },
  { keys: ['confiture', 'jam'],                      price: 0.25 },
  { keys: ['vin', 'wine'],                           price: 0.40 },
  { keys: ['bière', 'beer'],                         price: 0.35 },
  { keys: ['tofu'],                                  price: 0.70 },
  { keys: ['tempeh'],                                price: 0.90 },
];

// ---------------------------------------------------------------------------
// Matching flou : cherche si le nom de l'ingrédient contient un mot-clé
// ---------------------------------------------------------------------------
function lookupPrice(ingredientName: string): number | null {
  const n = ingredientName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Tri par longueur de clé décroissant → les clés précises matchent en premier
  const sorted = [...PRIX_FR].sort((a, b) =>
    Math.max(...b.keys.map(k => k.length)) - Math.max(...a.keys.map(k => k.length))
  );
  for (const entry of sorted) {
    for (const key of entry.keys) {
      const k = key.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (n.includes(k) || k.includes(n.split(' ')[0])) {
        return entry.price;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Interface résultat
// ---------------------------------------------------------------------------
export interface CostEstimate {
  total: number;           // coût total pour la recette (portions de base)
  perServing: number;      // coût par portion
  currency: string;        // 'EUR'
  breakdown: Array<{
    name: string;
    emoji: string;
    price: number;         // prix estimé pour cette ligne
    source: 'table' | 'unknown';
  }>;
  missingCount: number;    // ingrédients sans prix connu
  confidence: 'high' | 'medium' | 'low';
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
    const price = lookupPrice(ing.name);
    if (price == null) {
      missingCount++;
      return { name: ing.name, emoji: ing.emoji, price: 0, source: 'unknown' as const };
    }
    // Ajustement par quantité : base = 1 portion ~150g/1u
    // Pour des grandes quantités, on multiplie proportionnellement
    let multiplier = 1;
    const qty = ing.quantity;
    const unit = ing.unit.toLowerCase();
    if (['g', 'gr', 'gramme', 'grammes'].includes(unit))     multiplier = qty / 150;
    else if (['kg', 'kilogramme'].includes(unit))             multiplier = (qty * 1000) / 150;
    else if (['ml', 'cl', 'dl', 'l', 'litre'].includes(unit)) multiplier = qty > 10 ? qty / 150 : qty;
    else multiplier = qty; // unités (œufs, gousses, etc.)

    multiplier = Math.max(0.2, Math.min(multiplier, 6)); // clamp
    const linePrice = parseFloat((price * multiplier).toFixed(2));
    total += linePrice;
    return { name: ing.name, emoji: ing.emoji, price: linePrice, source: 'table' as const };
  });

  total = parseFloat(total.toFixed(2));
  const perServing = parseFloat((total / Math.max(servings, 1)).toFixed(2));

  const knownCount = ingredients.length - missingCount;
  const coverage = ingredients.length > 0 ? knownCount / ingredients.length : 0;
  const confidence: CostEstimate['confidence'] =
    coverage >= 0.75 ? 'high' : coverage >= 0.5 ? 'medium' : 'low';

  return { total, perServing, currency: 'EUR', breakdown, missingCount, confidence };
}
