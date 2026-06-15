/**
 * « La liste qu'on connaît » — durées de conservation indicatives au frigo
 * + possibilité de congélation, par aliment.
 *
 * Sert à estimer une date de péremption à l'ajout (scan ticket/photo/manuel)
 * et à suggérer la congélation pour l'anti-gaspi.
 *
 * Valeurs indicatives pour un produit frais acheté ce jour, conservé au frigo.
 * À titre d'aide — l'utilisateur reste juge (DLC réelle sur l'emballage).
 */

export interface ShelfInfo {
  /** Jours de conservation au réfrigérateur (frais) */
  days: number;
  /** Peut être congelé pour prolonger la conservation */
  freezable: boolean;
  /** Jours de conservation au congélateur (si freezable) */
  freezerDays?: number;
  /** Conseil court (décongélation, conservation…) */
  tip?: string;
}

interface Entry extends ShelfInfo { keys: string[] }

// Table — du plus spécifique au plus générique (l'ordre de matching trie par longueur de clé)
const TABLE: Entry[] = [
  // ── Viandes ──
  { keys: ['viande hachée', 'boeuf haché', 'steak haché', 'hach'], days: 2, freezable: true, freezerDays: 90, tip: 'Congeler le jour même si pas consommé sous 24-48h.' },
  { keys: ['poulet', 'volaille', 'dinde', 'escalope'], days: 3, freezable: true, freezerDays: 180, tip: 'Décongeler au frigo la veille.' },
  { keys: ['boeuf', 'bœuf', 'steak', 'entrecote', 'bavette'], days: 4, freezable: true, freezerDays: 270 },
  { keys: ['porc', 'côte de porc', 'roti'], days: 3, freezable: true, freezerDays: 180 },
  { keys: ['agneau', 'veau', 'gigot'], days: 3, freezable: true, freezerDays: 180 },
  { keys: ['lardons', 'bacon'], days: 7, freezable: true, freezerDays: 60 },
  { keys: ['jambon', 'charcuterie'], days: 5, freezable: true, freezerDays: 60 },
  { keys: ['saucisse', 'chipolata', 'merguez', 'chorizo'], days: 4, freezable: true, freezerDays: 60 },
  { keys: ['saucisson'], days: 30, freezable: false },
  // ── Poissons & fruits de mer ──
  { keys: ['saumon', 'thon', 'cabillaud', 'poisson', 'truite', 'colin', 'lieu', 'dorade', 'bar'], days: 2, freezable: true, freezerDays: 90, tip: 'Décongeler au frigo, ne jamais recongeler.' },
  { keys: ['crevette', 'gambas', 'fruits de mer', 'moule', 'crustace'], days: 2, freezable: true, freezerDays: 90 },
  // ── Produits laitiers & œufs ──
  { keys: ['lait'], days: 7, freezable: true, freezerDays: 90, tip: 'Se congèle (laisser de la place, bien agiter après).' },
  { keys: ['crème fraîche', 'crème', 'creme'], days: 10, freezable: false },
  { keys: ['beurre'], days: 30, freezable: true, freezerDays: 270 },
  { keys: ['yaourt', 'fromage blanc', 'skyr'], days: 14, freezable: false },
  { keys: ['fromage râpé', 'rape', 'emmental', 'gruyère', 'gruyere', 'comté', 'comte'], days: 21, freezable: true, freezerDays: 180 },
  { keys: ['mozzarella', 'feta', 'ricotta'], days: 10, freezable: false },
  { keys: ['camembert', 'brie', 'chèvre', 'chevre', 'fromage'], days: 14, freezable: false },
  { keys: ['oeuf', 'œuf'], days: 21, freezable: false, tip: 'Conserver pointe vers le bas.' },
  // ── Légumes ──
  { keys: ['salade', 'laitue', 'épinard', 'epinard', 'roquette', 'mâche', 'mache'], days: 4, freezable: false },
  { keys: ['herbes', 'persil', 'coriandre', 'basilic', 'ciboulette', 'menthe'], days: 5, freezable: true, freezerDays: 120, tip: 'Congeler ciselées dans un peu d\'huile.' },
  { keys: ['champignon'], days: 5, freezable: true, freezerDays: 90 },
  { keys: ['tomate', 'concombre', 'courgette', 'aubergine', 'poivron', 'brocoli', 'chou-fleur', 'haricot vert', 'petits pois'], days: 7, freezable: true, freezerDays: 240, tip: 'Blanchir avant congélation.' },
  { keys: ['carotte', 'poireau', 'céleri', 'celeri', 'navet', 'betterave', 'chou'], days: 14, freezable: true, freezerDays: 240 },
  { keys: ['pomme de terre', 'patate', 'oignon', 'échalote', 'echalote', 'ail', 'courge', 'potiron'], days: 30, freezable: false, tip: 'Conserver à l\'abri de la lumière, hors frigo.' },
  // ── Fruits ──
  { keys: ['fraise', 'framboise', 'myrtille', 'mûre', 'mure', 'cerise'], days: 3, freezable: true, freezerDays: 240 },
  { keys: ['banane', 'avocat', 'pêche', 'peche', 'abricot', 'prune', 'kiwi', 'figue'], days: 5, freezable: false },
  { keys: ['pomme', 'poire', 'orange', 'citron', 'pamplemousse', 'mandarine', 'raisin'], days: 14, freezable: false },
  // ── Boulangerie & féculents ──
  { keys: ['pain', 'baguette', 'brioche'], days: 3, freezable: true, freezerDays: 60, tip: 'Congeler tranché, passer au grille-pain directement.' },
  { keys: ['pâtes fraîches', 'pates fraiches', 'ravioli', 'gnocchi', 'tortellini'], days: 4, freezable: true, freezerDays: 60 },
  { keys: ['riz cuit', 'pâtes cuites', 'pates cuites'], days: 3, freezable: true, freezerDays: 30 },
  { keys: ['tofu'], days: 7, freezable: true, freezerDays: 90 },
  // ── Épicerie longue conservation ──
  { keys: ['conserve', 'boite', 'boîte', 'pâtes', 'pates', 'riz', 'farine', 'sucre', 'lentille', 'pois chiche', 'semoule', 'huile', 'vinaigre', 'café', 'cafe', 'thé', 'the', 'biscuit', 'chocolat'], days: 180, freezable: false },
];

const CATEGORY_FALLBACK: Record<string, ShelfInfo> = {
  'Viandes':   { days: 3, freezable: true, freezerDays: 180 },
  'Poissons':  { days: 2, freezable: true, freezerDays: 90 },
  'Légumes':   { days: 7, freezable: true, freezerDays: 180 },
  'Fruits':    { days: 7, freezable: false },
  'Produits laitiers': { days: 10, freezable: false },
};

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Renvoie l'info de conservation pour un nom d'ingrédient (null si inconnu). */
export function getShelfInfo(ingredientName: string, category?: string): ShelfInfo | null {
  const n = norm(ingredientName);
  const sorted = [...TABLE].sort(
    (a, b) => Math.max(...b.keys.map(k => k.length)) - Math.max(...a.keys.map(k => k.length)),
  );
  for (const entry of sorted) {
    for (const key of entry.keys) {
      if (n.includes(norm(key))) {
        return { days: entry.days, freezable: entry.freezable, freezerDays: entry.freezerDays, tip: entry.tip };
      }
    }
  }
  if (category && CATEGORY_FALLBACK[category]) return CATEGORY_FALLBACK[category];
  return null;
}

/** Date de péremption estimée (ISO yyyy-mm-dd) à partir d'aujourd'hui, ou null. */
export function estimateExpiryDate(ingredientName: string, category?: string, from: Date = new Date()): string | null {
  const info = getShelfInfo(ingredientName, category);
  if (!info) return null;
  const d = new Date(from.getTime() + info.days * 86400000);
  return d.toISOString().slice(0, 10);
}
