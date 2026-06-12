// Ingredients de saison par mois (France métropolitaine)
// Clé = mois (1-12), valeur = noms normalisés (minuscule, sans accent)
const SEASONAL: Record<number, string[]> = {
  1:  ['poireau', 'chou', 'carotte', 'navet', 'endive', 'mache', 'celeri', 'betterave', 'pomme', 'poire', 'kiwi', 'orange', 'mandarine', 'clementine', 'topinambour', 'panais'],
  2:  ['poireau', 'chou', 'carotte', 'navet', 'endive', 'mache', 'celeri', 'betterave', 'pomme', 'poire', 'kiwi', 'orange', 'mandarine', 'clementine', 'topinambour'],
  3:  ['poireau', 'chou', 'carotte', 'navet', 'endive', 'radis', 'epinard', 'asperge', 'pomme', 'kiwi', 'orange'],
  4:  ['asperge', 'radis', 'epinard', 'artichaut', 'petit pois', 'laitue', 'carotte', 'navet', 'fraise', 'rhubarbe'],
  5:  ['asperge', 'radis', 'epinard', 'artichaut', 'petit pois', 'laitue', 'fraise', 'cerise', 'rhubarbe', 'concombre', 'courgette'],
  6:  ['tomate', 'courgette', 'concombre', 'aubergine', 'poivron', 'haricot vert', 'petit pois', 'fraise', 'cerise', 'abricot', 'peche', 'melon', 'framboise'],
  7:  ['tomate', 'courgette', 'concombre', 'aubergine', 'poivron', 'haricot vert', 'abricot', 'peche', 'melon', 'framboise', 'myrtille', 'nectarine', 'pasteque', 'figue'],
  8:  ['tomate', 'courgette', 'concombre', 'aubergine', 'poivron', 'haricot vert', 'peche', 'melon', 'framboise', 'myrtille', 'nectarine', 'pasteque', 'figue', 'mirabelle', 'prune'],
  9:  ['tomate', 'courgette', 'aubergine', 'poivron', 'raisin', 'figue', 'prune', 'poire', 'pomme', 'chou', 'brocoli', 'epinard', 'courge', 'potiron'],
  10: ['courge', 'potiron', 'chou', 'brocoli', 'epinard', 'poireau', 'carotte', 'navet', 'pomme', 'poire', 'raisin', 'chataigne', 'noix', 'celeri'],
  11: ['courge', 'potiron', 'chou', 'poireau', 'carotte', 'navet', 'endive', 'betterave', 'pomme', 'poire', 'kiwi', 'chataigne', 'noix', 'clementine', 'topinambour', 'panais'],
  12: ['poireau', 'chou', 'carotte', 'navet', 'endive', 'mache', 'celeri', 'betterave', 'pomme', 'poire', 'kiwi', 'orange', 'mandarine', 'clementine', 'topinambour', 'panais'],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function getSeasonalIngredients(month?: number): string[] {
  const m = month ?? (new Date().getMonth() + 1);
  return SEASONAL[m] || [];
}

export function isIngredientSeasonal(name: string, month?: number): boolean {
  const m = month ?? (new Date().getMonth() + 1);
  const list = SEASONAL[m] || [];
  const norm = normalize(name);
  return list.some(s => norm.includes(s) || s.includes(norm));
}

export function countSeasonalIngredients(ingredientNames: string[], month?: number): number {
  return ingredientNames.filter(n => isIngredientSeasonal(n, month)).length;
}

export function getSeasonLabel(month?: number): string {
  const m = month ?? (new Date().getMonth() + 1);
  if (m >= 3 && m <= 5) return 'Printemps';
  if (m >= 6 && m <= 8) return 'Été';
  if (m >= 9 && m <= 11) return 'Automne';
  return 'Hiver';
}

export function getSeasonEmoji(month?: number): string {
  const m = month ?? (new Date().getMonth() + 1);
  if (m >= 3 && m <= 5) return '🌸';
  if (m >= 6 && m <= 8) return '☀️';
  if (m >= 9 && m <= 11) return '🍂';
  return '❄️';
}
