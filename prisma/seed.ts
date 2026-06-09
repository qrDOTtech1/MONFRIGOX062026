import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ingredients = [
  // Légumes
  { name: 'Tomate', category: 'Légumes', emoji: '🍅' },
  { name: 'Oignon', category: 'Légumes', emoji: '🧅' },
  { name: 'Ail', category: 'Légumes', emoji: '🧄' },
  { name: 'Carotte', category: 'Légumes', emoji: '🥕' },
  { name: 'Pomme de terre', category: 'Légumes', emoji: '🥔' },
  { name: 'Courgette', category: 'Légumes', emoji: '🥒' },
  { name: 'Poivron', category: 'Légumes', emoji: '🫑' },
  { name: 'Brocoli', category: 'Légumes', emoji: '🥦' },
  { name: 'Épinards', category: 'Légumes', emoji: '🥬' },
  { name: 'Champignon', category: 'Légumes', emoji: '🍄' },
  { name: 'Salade', category: 'Légumes', emoji: '🥗' },
  { name: 'Concombre', category: 'Légumes', emoji: '🥒' },
  { name: 'Aubergine', category: 'Légumes', emoji: '🍆' },
  { name: 'Haricots verts', category: 'Légumes', emoji: '🫘' },
  { name: 'Petits pois', category: 'Légumes', emoji: '🟢' },
  { name: 'Chou-fleur', category: 'Légumes', emoji: '🥦' },
  { name: 'Chou', category: 'Légumes', emoji: '🥬' },
  { name: 'Poireau', category: 'Légumes', emoji: '🥬' },
  { name: 'Céleri', category: 'Légumes', emoji: '🥬' },
  { name: 'Betterave', category: 'Légumes', emoji: '🟣' },
  { name: 'Radis', category: 'Légumes', emoji: '🔴' },
  { name: 'Patate douce', category: 'Légumes', emoji: '🍠' },
  { name: 'Maïs', category: 'Légumes', emoji: '🌽' },
  { name: 'Artichaut', category: 'Légumes', emoji: '🌿' },
  { name: 'Asperges', category: 'Légumes', emoji: '🌿' },
  { name: 'Fenouil', category: 'Légumes', emoji: '🌿' },
  // Fruits
  { name: 'Pomme', category: 'Fruits', emoji: '🍎' },
  { name: 'Banane', category: 'Fruits', emoji: '🍌' },
  { name: 'Citron', category: 'Fruits', emoji: '🍋' },
  { name: 'Orange', category: 'Fruits', emoji: '🍊' },
  { name: 'Fraise', category: 'Fruits', emoji: '🍓' },
  { name: 'Avocat', category: 'Fruits', emoji: '🥑' },
  { name: 'Citron vert', category: 'Fruits', emoji: '🍋' },
  { name: 'Poire', category: 'Fruits', emoji: '🍐' },
  { name: 'Mangue', category: 'Fruits', emoji: '🥭' },
  { name: 'Ananas', category: 'Fruits', emoji: '🍍' },
  { name: 'Raisin', category: 'Fruits', emoji: '🍇' },
  // Produits laitiers
  { name: 'Lait', category: 'Produits laitiers', emoji: '🥛' },
  { name: 'Beurre', category: 'Produits laitiers', emoji: '🧈' },
  { name: 'Crème fraîche', category: 'Produits laitiers', emoji: '🫙' },
  { name: 'Fromage râpé', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Gruyère', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Mozzarella', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Yaourt', category: 'Produits laitiers', emoji: '🫙' },
  { name: 'Œuf', category: 'Produits laitiers', emoji: '🥚' },
  { name: 'Parmesan', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Ricotta', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Feta', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Mascarpone', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Chèvre', category: 'Produits laitiers', emoji: '🧀' },
  { name: 'Crème liquide', category: 'Produits laitiers', emoji: '🥛' },
  // Viandes & Poissons
  { name: 'Poulet', category: 'Viandes', emoji: '🍗' },
  { name: 'Bœuf haché', category: 'Viandes', emoji: '🥩' },
  { name: 'Lardons', category: 'Viandes', emoji: '🥓' },
  { name: 'Jambon', category: 'Viandes', emoji: '🍖' },
  { name: 'Saumon', category: 'Poissons', emoji: '🐟' },
  { name: 'Thon', category: 'Poissons', emoji: '🐟' },
  { name: 'Crevettes', category: 'Poissons', emoji: '🦐' },
  { name: 'Steak', category: 'Viandes', emoji: '🥩' },
  { name: 'Saucisse', category: 'Viandes', emoji: '🌭' },
  { name: 'Merguez', category: 'Viandes', emoji: '🌭' },
  { name: 'Dinde', category: 'Viandes', emoji: '🍗' },
  { name: 'Agneau', category: 'Viandes', emoji: '🍖' },
  { name: 'Canard', category: 'Viandes', emoji: '🦆' },
  { name: 'Porc', category: 'Viandes', emoji: '🍖' },
  { name: 'Cabillaud', category: 'Poissons', emoji: '🐟' },
  { name: 'Moules', category: 'Poissons', emoji: '🦪' },
  // Féculents & Céréales
  { name: 'Pâtes', category: 'Féculents', emoji: '🍝' },
  { name: 'Riz', category: 'Féculents', emoji: '🍚' },
  { name: 'Pain', category: 'Féculents', emoji: '🍞' },
  { name: 'Farine', category: 'Féculents', emoji: '🌾' },
  { name: 'Gnocchi', category: 'Féculents', emoji: '🥟' },
  { name: 'Tortilla', category: 'Féculents', emoji: '🫓' },
  { name: 'Pain de mie', category: 'Féculents', emoji: '🍞' },
  { name: 'Semoule', category: 'Féculents', emoji: '🌾' },
  { name: 'Nouilles', category: 'Féculents', emoji: '🍜' },
  { name: 'Riz basmati', category: 'Féculents', emoji: '🍚' },
  { name: 'Pâte feuilletée', category: 'Féculents', emoji: '🥐' },
  { name: 'Pâte brisée', category: 'Féculents', emoji: '🥧' },
  { name: 'Pois chiches', category: 'Féculents', emoji: '🫘' },
  { name: 'Lentilles', category: 'Féculents', emoji: '🫘' },
  { name: 'Haricots rouges', category: 'Féculents', emoji: '🫘' },
  { name: 'Quinoa', category: 'Féculents', emoji: '🌾' },
  { name: 'Boulgour', category: 'Féculents', emoji: '🌾' },
  // Condiments & Épices
  { name: 'Huile d\'olive', category: 'Condiments', emoji: '🫒' },
  { name: 'Sel', category: 'Condiments', emoji: '🧂' },
  { name: 'Poivre', category: 'Condiments', emoji: '🌶️' },
  { name: 'Sauce soja', category: 'Condiments', emoji: '🥢' },
  { name: 'Moutarde', category: 'Condiments', emoji: '🟡' },
  { name: 'Vinaigre', category: 'Condiments', emoji: '🍶' },
  { name: 'Sauce tomate', category: 'Condiments', emoji: '🍅' },
  { name: 'Curry', category: 'Épices', emoji: '🟡' },
  { name: 'Paprika', category: 'Épices', emoji: '🌶️' },
  { name: 'Herbes de Provence', category: 'Épices', emoji: '🌿' },
  { name: 'Basilic', category: 'Épices', emoji: '🌿' },
  { name: 'Persil', category: 'Épices', emoji: '🌿' },
  { name: 'Cumin', category: 'Épices', emoji: '🟤' },
  { name: 'Gingembre', category: 'Épices', emoji: '🫚' },
  { name: 'Coriandre', category: 'Épices', emoji: '🌿' },
  { name: 'Thym', category: 'Épices', emoji: '🌿' },
  { name: 'Romarin', category: 'Épices', emoji: '🌿' },
  { name: 'Cannelle', category: 'Épices', emoji: '🟤' },
  { name: 'Piment', category: 'Épices', emoji: '🌶️' },
  { name: 'Harissa', category: 'Condiments', emoji: '🌶️' },
  { name: 'Nuoc-mâm', category: 'Condiments', emoji: '🥢' },
  { name: 'Tahini', category: 'Condiments', emoji: '🫙' },
  { name: 'Vinaigre balsamique', category: 'Condiments', emoji: '🍶' },
  { name: 'Concentré de tomate', category: 'Condiments', emoji: '🍅' },
  { name: 'Mayonnaise', category: 'Condiments', emoji: '🫙' },
  { name: 'Ketchup', category: 'Condiments', emoji: '🍅' },
  // Autres
  { name: 'Sucre', category: 'Autres', emoji: '🍬' },
  { name: 'Chocolat', category: 'Autres', emoji: '🍫' },
  { name: 'Miel', category: 'Autres', emoji: '🍯' },
  { name: 'Noix', category: 'Autres', emoji: '🥜' },
  { name: 'Lait de coco', category: 'Autres', emoji: '🥥' },
  { name: 'Bouillon cube', category: 'Autres', emoji: '🧊' },
  { name: 'Levure', category: 'Autres', emoji: '🧫' },
  { name: 'Chapelure', category: 'Autres', emoji: '🍞' },
  { name: 'Amandes', category: 'Autres', emoji: '🥜' },
  { name: 'Olives', category: 'Autres', emoji: '🫒' },
  { name: 'Câpres', category: 'Autres', emoji: '🟢' },
  { name: 'Cornichons', category: 'Autres', emoji: '🥒' },
  { name: 'Tomates séchées', category: 'Autres', emoji: '🍅' },
  { name: 'Pignons de pin', category: 'Autres', emoji: '🌰' },
  { name: 'Raisins secs', category: 'Autres', emoji: '🍇' },
  { name: 'Vin blanc', category: 'Autres', emoji: '🍷' },
  { name: 'Bière', category: 'Autres', emoji: '🍺' },
];

interface RecipeSeed {
  name: string;
  description: string;
  instructions: string;
  difficulty: 'FACILE' | 'MOYEN' | 'DIFFICILE';
  prepTime: number;
  cuisine: string;
  servings: number;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
}

const recipes: RecipeSeed[] = [
  // ===== FRANCE =====
  {
    name: 'Quiche sans pâte au brocoli',
    description: 'Une quiche légère et rapide sans pâte, garnie de brocoli fondant et de gruyère.',
    instructions: 'Préchauffer le four à 180°C.\nCouper le brocoli en petits bouquets et le faire cuire 5 min à la vapeur.\nBattre les œufs avec la crème fraîche, le sel et le poivre.\nBeurrer un moule et y disposer le brocoli.\nVerser le mélange œufs-crème et parsemer de gruyère.\nEnfourner 25 minutes jusqu\'à ce que ce soit doré.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'FR', servings: 4,
    ingredients: [
      { name: 'Brocoli', quantity: 1, unit: 'tête' }, { name: 'Œuf', quantity: 4, unit: 'pièces' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' }, { name: 'Gruyère', quantity: 100, unit: 'g' }, { name: 'Beurre', quantity: 10, unit: 'g' },
    ],
  },
  {
    name: 'Pâtes carbonara',
    description: 'La vraie recette italienne avec lardons, œufs et parmesan — sans crème!',
    instructions: 'Faire cuire les pâtes al dente.\nFaire revenir les lardons dans une poêle sans matière grasse.\nBattre les œufs avec le parmesan râpé et du poivre.\nÉgoutter les pâtes et les ajouter aux lardons hors du feu.\nVerser le mélange œufs-parmesan et mélanger vivement.\nServir immédiatement.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Pâtes', quantity: 400, unit: 'g' }, { name: 'Lardons', quantity: 200, unit: 'g' },
      { name: 'Œuf', quantity: 3, unit: 'pièces' }, { name: 'Parmesan', quantity: 80, unit: 'g' }, { name: 'Poivre', quantity: 1, unit: 'pincée' },
    ],
  },
  {
    name: 'Croque-monsieur',
    description: 'Le classique français: jambon, gruyère et béchamel entre deux tranches de pain.',
    instructions: 'Tartiner le pain de mie de beurre.\nDéposer une tranche de jambon et du gruyère râpé.\nRefermer avec la deuxième tranche.\nBadigeonner le dessus de beurre fondu et de gruyère.\nPasser au four à 200°C pendant 10 minutes.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'FR', servings: 2,
    ingredients: [
      { name: 'Pain de mie', quantity: 4, unit: 'tranches' }, { name: 'Jambon', quantity: 2, unit: 'tranches' },
      { name: 'Gruyère', quantity: 100, unit: 'g' }, { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Ratatouille provençale',
    description: 'Un grand classique du sud de la France, coloré et savoureux.',
    instructions: 'Couper tous les légumes en dés.\nFaire revenir l\'oignon et l\'ail dans l\'huile d\'olive.\nAjouter les poivrons et les aubergines, cuire 5 min.\nAjouter les courgettes et les tomates.\nAssaisonner avec les herbes de Provence, sel et poivre.\nLaisser mijoter 30 minutes à feu doux.',
    difficulty: 'MOYEN', prepTime: 45, cuisine: 'FR', servings: 6,
    ingredients: [
      { name: 'Tomate', quantity: 4, unit: 'pièces' }, { name: 'Courgette', quantity: 2, unit: 'pièces' },
      { name: 'Aubergine', quantity: 1, unit: 'pièce' }, { name: 'Poivron', quantity: 2, unit: 'pièces' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' }, { name: 'Ail', quantity: 3, unit: 'gousses' },
      { name: 'Herbes de Provence', quantity: 2, unit: 'c.à.c.' }, { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Gratin dauphinois',
    description: 'Le gratin de pommes de terre crémeux et doré, un classique indémodable.',
    instructions: 'Préchauffer le four à 180°C.\nÉplucher et couper les pommes de terre en fines rondelles.\nFrotter un plat à gratin avec l\'ail et le beurrer.\nDisposer les pommes de terre en couches.\nMélanger le lait et la crème, assaisonner.\nVerser sur les pommes de terre.\nEnfourner 1h à 1h15.',
    difficulty: 'MOYEN', prepTime: 75, cuisine: 'FR', servings: 6,
    ingredients: [
      { name: 'Pomme de terre', quantity: 1000, unit: 'g' }, { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Lait', quantity: 300, unit: 'ml' }, { name: 'Ail', quantity: 2, unit: 'gousses' }, { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Mousse au chocolat',
    description: 'La mousse au chocolat fondante et aérienne, un dessert incontournable.',
    instructions: 'Faire fondre le chocolat au bain-marie avec le beurre.\nSéparer les blancs des jaunes.\nMélanger les jaunes avec le chocolat fondu.\nMonter les blancs en neige ferme avec une pincée de sucre.\nIncorporer délicatement les blancs au chocolat.\nRéfrigérer 4 heures minimum.',
    difficulty: 'MOYEN', prepTime: 20, cuisine: 'FR', servings: 6,
    ingredients: [
      { name: 'Chocolat', quantity: 200, unit: 'g' }, { name: 'Œuf', quantity: 6, unit: 'pièces' },
      { name: 'Beurre', quantity: 30, unit: 'g' }, { name: 'Sucre', quantity: 30, unit: 'g' },
    ],
  },
  {
    name: 'Soupe à l\'oignon gratinée',
    description: 'La soupe à l\'oignon traditionnelle avec croûtons et fromage gratiné.',
    instructions: 'Émincer finement les oignons.\nLes faire caraméliser dans le beurre pendant 30 minutes à feu doux.\nAjouter la farine, mélanger.\nVerser le bouillon et laisser mijoter 20 minutes.\nVerser dans des bols, ajouter des croûtons de pain et du gruyère.\nGratiner au four 5 minutes.',
    difficulty: 'MOYEN', prepTime: 55, cuisine: 'FR', servings: 4,
    ingredients: [
      { name: 'Oignon', quantity: 5, unit: 'pièces' }, { name: 'Beurre', quantity: 40, unit: 'g' },
      { name: 'Farine', quantity: 20, unit: 'g' }, { name: 'Bouillon cube', quantity: 2, unit: 'pièces' },
      { name: 'Pain', quantity: 4, unit: 'tranches' }, { name: 'Gruyère', quantity: 150, unit: 'g' },
    ],
  },
  {
    name: 'Quiche lorraine',
    description: 'La quiche classique aux lardons et à la crème, sur une pâte brisée croustillante.',
    instructions: 'Préchauffer le four à 180°C.\nÉtaler la pâte brisée dans un moule.\nFaire revenir les lardons.\nBattre les œufs avec la crème fraîche.\nDisposer les lardons sur la pâte.\nVerser l\'appareil et parsemer de gruyère.\nEnfourner 35 minutes.',
    difficulty: 'MOYEN', prepTime: 45, cuisine: 'FR', servings: 6,
    ingredients: [
      { name: 'Pâte brisée', quantity: 1, unit: 'pièce' }, { name: 'Lardons', quantity: 200, unit: 'g' },
      { name: 'Œuf', quantity: 3, unit: 'pièces' }, { name: 'Crème fraîche', quantity: 250, unit: 'ml' },
      { name: 'Gruyère', quantity: 80, unit: 'g' },
    ],
  },
  {
    name: 'Blanquette de poulet',
    description: 'Version rapide de la blanquette, avec du poulet tendre en sauce blanche.',
    instructions: 'Couper le poulet en morceaux.\nFaire revenir dans le beurre sans colorer.\nAjouter les carottes en rondelles et le poireau émincé.\nCouvrir de bouillon et cuire 25 minutes.\nDans un bol, mélanger la crème avec un jaune d\'œuf.\nVerser dans la sauce hors du feu, mélanger.\nServir avec du riz.',
    difficulty: 'MOYEN', prepTime: 40, cuisine: 'FR', servings: 4,
    ingredients: [
      { name: 'Poulet', quantity: 600, unit: 'g' }, { name: 'Carotte', quantity: 3, unit: 'pièces' },
      { name: 'Poireau', quantity: 1, unit: 'pièce' }, { name: 'Crème fraîche', quantity: 150, unit: 'ml' },
      { name: 'Œuf', quantity: 1, unit: 'pièce' }, { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Beurre', quantity: 30, unit: 'g' }, { name: 'Riz', quantity: 300, unit: 'g' },
    ],
  },
  {
    name: 'Poulet rôti aux herbes',
    description: 'Un poulet doré et juteux, parfumé aux herbes de Provence.',
    instructions: 'Préchauffer le four à 200°C.\nFrotter le poulet avec beurre, herbes, sel et poivre.\nPlacer dans un plat avec les pommes de terre coupées en quartiers.\nArroser d\'huile d\'olive.\nEnfourner 1h15 en arrosant régulièrement.\nLaisser reposer 10 minutes avant de découper.',
    difficulty: 'MOYEN', prepTime: 80, cuisine: 'FR', servings: 6,
    ingredients: [
      { name: 'Poulet', quantity: 1500, unit: 'g' }, { name: 'Pomme de terre', quantity: 800, unit: 'g' },
      { name: 'Beurre', quantity: 40, unit: 'g' }, { name: 'Herbes de Provence', quantity: 2, unit: 'c.à.s.' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Soupe de légumes maison',
    description: 'Une soupe réconfortante avec les légumes du frigo, parfaite pour ne rien gaspiller.',
    instructions: 'Éplucher et couper tous les légumes en morceaux.\nFaire revenir l\'oignon dans un peu d\'huile.\nAjouter tous les légumes et le bouillon cube avec de l\'eau.\nLaisser cuire 25 minutes.\nMixer selon la texture souhaitée.\nAssaisonner et servir chaud.',
    difficulty: 'FACILE', prepTime: 30, cuisine: 'FR', servings: 4,
    ingredients: [
      { name: 'Carotte', quantity: 3, unit: 'pièces' }, { name: 'Pomme de terre', quantity: 2, unit: 'pièces' },
      { name: 'Courgette', quantity: 1, unit: 'pièce' }, { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    name: 'Crêpes sucrées',
    description: 'Des crêpes fines et moelleuses à garnir selon tes envies.',
    instructions: 'Mélanger la farine, les œufs et le sucre.\nAjouter le lait petit à petit en fouettant.\nAjouter le beurre fondu.\nLaisser reposer 30 minutes.\nCuire les crêpes dans une poêle beurrée.\nGarnir de chocolat, miel ou fruits.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'FR', servings: 8,
    ingredients: [
      { name: 'Farine', quantity: 250, unit: 'g' }, { name: 'Œuf', quantity: 3, unit: 'pièces' },
      { name: 'Lait', quantity: 500, unit: 'ml' }, { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Sucre', quantity: 30, unit: 'g' },
    ],
  },
  {
    name: 'Tarte aux poireaux et chèvre',
    description: 'Une tarte fondante et parfumée au poireau et au fromage de chèvre.',
    instructions: 'Préchauffer le four à 180°C.\nÉtaler la pâte dans un moule.\nFaire fondre les poireaux émincés dans du beurre 15 min.\nBattre les œufs avec la crème.\nDisposer les poireaux, le chèvre en rondelles.\nVerser l\'appareil.\nEnfourner 30 minutes.',
    difficulty: 'MOYEN', prepTime: 50, cuisine: 'FR', servings: 6,
    ingredients: [
      { name: 'Pâte brisée', quantity: 1, unit: 'pièce' }, { name: 'Poireau', quantity: 3, unit: 'pièces' },
      { name: 'Chèvre', quantity: 150, unit: 'g' }, { name: 'Œuf', quantity: 2, unit: 'pièces' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' }, { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Salade niçoise',
    description: 'La salade du sud avec thon, œufs, olives et légumes croquants.',
    instructions: 'Cuire les œufs durs 10 minutes.\nCouper les tomates en quartiers, le concombre en rondelles.\nDisposer la salade, ajouter les légumes.\nÉmietter le thon par-dessus.\nAjouter les olives et les œufs coupés.\nAssaisonner huile d\'olive, sel, poivre.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'FR', servings: 2,
    ingredients: [
      { name: 'Thon', quantity: 1, unit: 'boîte' }, { name: 'Œuf', quantity: 2, unit: 'pièces' },
      { name: 'Tomate', quantity: 2, unit: 'pièces' }, { name: 'Concombre', quantity: 1, unit: 'demi' },
      { name: 'Salade', quantity: 1, unit: 'pièce' }, { name: 'Olives', quantity: 50, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  // ===== ITALIE =====
  {
    name: 'Gnocchi au gruyère fondu',
    description: 'Des gnocchi dorés nappés d\'une sauce crémeuse au gruyère fondant.',
    instructions: 'Faire cuire les gnocchi dans l\'eau bouillante salée jusqu\'à ce qu\'ils remontent.\nDans une poêle, faire fondre le beurre et y faire revenir les gnocchi.\nAjouter la crème fraîche et le gruyère râpé.\nMélanger jusqu\'à obtenir une sauce onctueuse.\nAssaisonner et servir chaud.',
    difficulty: 'MOYEN', prepTime: 35, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Gnocchi', quantity: 500, unit: 'g' }, { name: 'Gruyère', quantity: 150, unit: 'g' },
      { name: 'Crème fraîche', quantity: 150, unit: 'ml' }, { name: 'Beurre', quantity: 30, unit: 'g' },
    ],
  },
  {
    name: 'Pâtes au pesto maison',
    description: 'Des pâtes al dente nappées d\'un pesto frais fait maison au basilic.',
    instructions: 'Faire cuire les pâtes al dente.\nMixer le basilic, l\'ail, les noix, le parmesan et l\'huile d\'olive.\nÉgoutter les pâtes en gardant un peu d\'eau de cuisson.\nMélanger les pâtes avec le pesto.\nServir avec du parmesan supplémentaire.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Pâtes', quantity: 400, unit: 'g' }, { name: 'Basilic', quantity: 1, unit: 'bouquet' },
      { name: 'Parmesan', quantity: 50, unit: 'g' }, { name: 'Ail', quantity: 1, unit: 'gousse' },
      { name: 'Noix', quantity: 30, unit: 'g' }, { name: 'Huile d\'olive', quantity: 4, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Risotto aux champignons',
    description: 'Un risotto onctueux et crémeux aux champignons et au parmesan.',
    instructions: 'Faire revenir l\'oignon dans le beurre.\nAjouter le riz et le faire nacrer 2 minutes.\nAjouter le bouillon louche par louche en remuant.\nFaire sauter les champignons séparément.\nQuand le riz est cuit, incorporer champignons, parmesan et beurre.\nServir crémeux.',
    difficulty: 'MOYEN', prepTime: 35, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Riz', quantity: 300, unit: 'g' }, { name: 'Champignon', quantity: 250, unit: 'g' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' }, { name: 'Parmesan', quantity: 60, unit: 'g' },
      { name: 'Beurre', quantity: 40, unit: 'g' }, { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    name: 'Pizza maison express',
    description: 'Une pizza maison rapide avec une pâte minute.',
    instructions: 'Mélanger la farine, la levure, l\'huile d\'olive et l\'eau tiède.\nPétrir 5 minutes et étaler sur une plaque.\nÉtaler la sauce tomate.\nAjouter la mozzarella, le jambon et les champignons.\nEnfourner à 220°C pendant 15 minutes.',
    difficulty: 'MOYEN', prepTime: 30, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Farine', quantity: 300, unit: 'g' }, { name: 'Sauce tomate', quantity: 200, unit: 'ml' },
      { name: 'Mozzarella', quantity: 200, unit: 'g' }, { name: 'Jambon', quantity: 4, unit: 'tranches' },
      { name: 'Champignon', quantity: 150, unit: 'g' }, { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
      { name: 'Levure', quantity: 1, unit: 'sachet' },
    ],
  },
  {
    name: 'Lasagnes bolognaise',
    description: 'Des lasagnes généreuses avec sauce bolognaise maison et béchamel.',
    instructions: 'Faire revenir oignon et ail, ajouter le bœuf haché.\nAjouter la sauce tomate et le concentré, mijoter 20 min.\nPréparer la béchamel: beurre, farine, lait.\nAlternar couches de pâtes, sauce, béchamel dans un plat.\nTerminer par béchamel et parmesan.\nEnfourner 35 min à 180°C.',
    difficulty: 'DIFFICILE', prepTime: 75, cuisine: 'IT', servings: 6,
    ingredients: [
      { name: 'Pâtes', quantity: 250, unit: 'g' }, { name: 'Bœuf haché', quantity: 500, unit: 'g' },
      { name: 'Sauce tomate', quantity: 400, unit: 'ml' }, { name: 'Concentré de tomate', quantity: 2, unit: 'c.à.s.' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' }, { name: 'Beurre', quantity: 40, unit: 'g' },
      { name: 'Farine', quantity: 40, unit: 'g' }, { name: 'Lait', quantity: 500, unit: 'ml' },
      { name: 'Parmesan', quantity: 80, unit: 'g' },
    ],
  },
  {
    name: 'Bruschetta tomates basilic',
    description: 'Des tartines grillées garnies de tomates fraîches et basilic.',
    instructions: 'Couper les tomates en petits dés.\nMélanger avec basilic ciselé, ail, huile d\'olive, sel.\nLaisser mariner 10 min.\nGriller les tranches de pain.\nFrotter le pain avec une gousse d\'ail.\nGarnir de la préparation.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Tomate', quantity: 4, unit: 'pièces' }, { name: 'Basilic', quantity: 1, unit: 'bouquet' },
      { name: 'Pain', quantity: 8, unit: 'tranches' }, { name: 'Ail', quantity: 2, unit: 'gousses' },
      { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Pâtes all\'arrabbiata',
    description: 'Des pâtes relevées à la sauce tomate pimentée, simple et efficace.',
    instructions: 'Faire cuire les pâtes al dente.\nDans une poêle, faire revenir l\'ail et le piment dans l\'huile.\nAjouter la sauce tomate et cuire 10 min.\nMélanger avec les pâtes égouttées.\nParsemer de persil et servir.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'IT', servings: 4,
    ingredients: [
      { name: 'Pâtes', quantity: 400, unit: 'g' }, { name: 'Sauce tomate', quantity: 400, unit: 'ml' },
      { name: 'Ail', quantity: 3, unit: 'gousses' }, { name: 'Piment', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' }, { name: 'Persil', quantity: 1, unit: 'bouquet' },
    ],
  },
  // ===== JAPON =====
  {
    name: 'Omelette street food façon Tokyo',
    description: 'Une omelette japonaise roulée, moelleuse et légèrement sucrée.',
    instructions: 'Battre les œufs avec une pincée de sucre et la sauce soja.\nHuiler une poêle à feu moyen.\nVerser une fine couche d\'œuf et la rouler quand à peine prise.\nRépéter en ajoutant de fines couches.\nCouper en tranches et servir avec du riz.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'JP', servings: 2,
    ingredients: [
      { name: 'Œuf', quantity: 4, unit: 'pièces' }, { name: 'Sauce soja', quantity: 1, unit: 'c.à.s.' },
      { name: 'Sucre', quantity: 1, unit: 'c.à.c.' }, { name: 'Huile d\'olive', quantity: 1, unit: 'c.à.s.' },
      { name: 'Riz', quantity: 200, unit: 'g' },
    ],
  },
  {
    name: 'Riz sauté japonais',
    description: 'Un riz sauté simple et savoureux à la japonaise avec œuf et légumes.',
    instructions: 'Cuire le riz et le laisser refroidir.\nBattre les œufs et les brouiller dans la poêle.\nAjouter les carottes en petits dés, cuire 3 min.\nAjouter le riz froid et sauter à feu vif.\nAssaisonner sauce soja et poivre.\nServir chaud.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'JP', servings: 2,
    ingredients: [
      { name: 'Riz', quantity: 300, unit: 'g' }, { name: 'Œuf', quantity: 2, unit: 'pièces' },
      { name: 'Carotte', quantity: 1, unit: 'pièce' }, { name: 'Sauce soja', quantity: 2, unit: 'c.à.s.' },
      { name: 'Petits pois', quantity: 80, unit: 'g' },
    ],
  },
  {
    name: 'Nouilles sautées teriyaki',
    description: 'Des nouilles sautées au poulet avec une sauce teriyaki maison.',
    instructions: 'Cuire les nouilles selon le paquet.\nCouper le poulet en lamelles et le saisir.\nAjouter le poivron émincé.\nMélanger sauce soja, miel et gingembre.\nAjouter les nouilles et la sauce.\nSauter à feu vif 2 minutes et servir.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'JP', servings: 2,
    ingredients: [
      { name: 'Nouilles', quantity: 200, unit: 'g' }, { name: 'Poulet', quantity: 250, unit: 'g' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' }, { name: 'Sauce soja', quantity: 3, unit: 'c.à.s.' },
      { name: 'Miel', quantity: 2, unit: 'c.à.s.' }, { name: 'Gingembre', quantity: 1, unit: 'c.à.c.' },
    ],
  },
  // ===== MEXIQUE =====
  {
    name: 'Tacos au bœuf épicé',
    description: 'Des tacos croustillants garnis de bœuf haché épicé, tomate et fromage.',
    instructions: 'Faire revenir le bœuf haché avec l\'oignon émincé.\nAjouter le paprika, le cumin et la sauce tomate.\nLaisser cuire 10 minutes.\nGarnir les tortillas avec la viande, la tomate et le fromage.\nServir avec de la salade.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'MX', servings: 4,
    ingredients: [
      { name: 'Bœuf haché', quantity: 400, unit: 'g' }, { name: 'Tortilla', quantity: 8, unit: 'pièces' },
      { name: 'Tomate', quantity: 2, unit: 'pièces' }, { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Fromage râpé', quantity: 100, unit: 'g' }, { name: 'Paprika', quantity: 1, unit: 'c.à.c.' },
      { name: 'Cumin', quantity: 1, unit: 'c.à.c.' }, { name: 'Sauce tomate', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Wrap poulet-avocat',
    description: 'Un wrap frais et gourmand, parfait pour un déjeuner rapide.',
    instructions: 'Griller le poulet et le couper en lamelles.\nÉcraser l\'avocat avec du citron et du sel.\nTartiner la tortilla avec l\'avocat.\nAjouter le poulet, la tomate et la salade.\nRouler serré et couper en deux.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'MX', servings: 2,
    ingredients: [
      { name: 'Tortilla', quantity: 2, unit: 'pièces' }, { name: 'Poulet', quantity: 200, unit: 'g' },
      { name: 'Avocat', quantity: 1, unit: 'pièce' }, { name: 'Tomate', quantity: 1, unit: 'pièce' },
      { name: 'Salade', quantity: 3, unit: 'feuilles' }, { name: 'Citron', quantity: 1, unit: 'demi' },
    ],
  },
  {
    name: 'Guacamole maison',
    description: 'Le guacamole frais et crémeux, parfait en apéro.',
    instructions: 'Écraser les avocats à la fourchette.\nAjouter l\'oignon finement haché.\nPresser le citron vert.\nAjouter la tomate en petits dés.\nAssaisonner sel, piment, coriandre.\nServir immédiatement avec des tortillas.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'MX', servings: 4,
    ingredients: [
      { name: 'Avocat', quantity: 3, unit: 'pièces' }, { name: 'Citron vert', quantity: 2, unit: 'pièces' },
      { name: 'Tomate', quantity: 1, unit: 'pièce' }, { name: 'Oignon', quantity: 1, unit: 'demi' },
      { name: 'Coriandre', quantity: 1, unit: 'bouquet' }, { name: 'Piment', quantity: 1, unit: 'pincée' },
    ],
  },
  {
    name: 'Chili con carne',
    description: 'Un chili texan épicé avec bœuf, haricots rouges et tomate.',
    instructions: 'Faire revenir l\'oignon et l\'ail.\nAjouter le bœuf haché et le faire dorer.\nAjouter paprika, cumin, piment.\nAjouter sauce tomate et haricots rouges égouttés.\nLaisser mijoter 30 minutes.\nServir avec du riz.',
    difficulty: 'MOYEN', prepTime: 45, cuisine: 'MX', servings: 6,
    ingredients: [
      { name: 'Bœuf haché', quantity: 500, unit: 'g' }, { name: 'Haricots rouges', quantity: 400, unit: 'g' },
      { name: 'Sauce tomate', quantity: 400, unit: 'ml' }, { name: 'Oignon', quantity: 2, unit: 'pièces' },
      { name: 'Ail', quantity: 3, unit: 'gousses' }, { name: 'Paprika', quantity: 1, unit: 'c.à.s.' },
      { name: 'Cumin', quantity: 1, unit: 'c.à.c.' }, { name: 'Riz', quantity: 300, unit: 'g' },
    ],
  },
  // ===== INDE =====
  {
    name: 'Curry de poulet express',
    description: 'Un curry crémeux et parfumé prêt en 25 minutes, avec du lait de coco.',
    instructions: 'Couper le poulet en morceaux.\nFaire revenir l\'oignon et l\'ail.\nAjouter le poulet et le faire dorer.\nSaupoudrer de curry.\nVerser le lait de coco et la sauce tomate.\nLaisser mijoter 15 minutes.\nServir avec du riz.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'IN', servings: 4,
    ingredients: [
      { name: 'Poulet', quantity: 500, unit: 'g' }, { name: 'Lait de coco', quantity: 400, unit: 'ml' },
      { name: 'Curry', quantity: 2, unit: 'c.à.s.' }, { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousses' }, { name: 'Sauce tomate', quantity: 2, unit: 'c.à.s.' },
      { name: 'Riz', quantity: 300, unit: 'g' },
    ],
  },
  {
    name: 'Dal de lentilles',
    description: 'Un dal indien réconfortant aux lentilles, épicé et crémeux.',
    instructions: 'Rincer les lentilles.\nFaire revenir oignon, ail et gingembre.\nAjouter curry, cumin, curcuma.\nAjouter les lentilles et couvrir d\'eau.\nCuire 25 minutes jusqu\'à tendreté.\nAjouter un filet de lait de coco.\nServir avec du riz basmati.',
    difficulty: 'FACILE', prepTime: 35, cuisine: 'IN', servings: 4,
    ingredients: [
      { name: 'Lentilles', quantity: 300, unit: 'g' }, { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 3, unit: 'gousses' }, { name: 'Gingembre', quantity: 1, unit: 'c.à.c.' },
      { name: 'Curry', quantity: 1, unit: 'c.à.s.' }, { name: 'Cumin', quantity: 1, unit: 'c.à.c.' },
      { name: 'Lait de coco', quantity: 200, unit: 'ml' }, { name: 'Riz basmati', quantity: 300, unit: 'g' },
    ],
  },
  {
    name: 'Poulet tikka masala',
    description: 'Le grand classique des restaurants indiens, crémeux et épicé.',
    instructions: 'Mariner le poulet dans yaourt, curry et paprika 30 min.\nGriller le poulet dans une poêle.\nFaire revenir oignon et ail.\nAjouter sauce tomate, crème, curry.\nMijoter 15 minutes.\nAjouter le poulet grillé.\nServir avec du riz basmati.',
    difficulty: 'MOYEN', prepTime: 45, cuisine: 'IN', servings: 4,
    ingredients: [
      { name: 'Poulet', quantity: 500, unit: 'g' }, { name: 'Yaourt', quantity: 100, unit: 'g' },
      { name: 'Sauce tomate', quantity: 300, unit: 'ml' }, { name: 'Crème fraîche', quantity: 100, unit: 'ml' },
      { name: 'Oignon', quantity: 2, unit: 'pièces' }, { name: 'Ail', quantity: 3, unit: 'gousses' },
      { name: 'Curry', quantity: 2, unit: 'c.à.s.' }, { name: 'Paprika', quantity: 1, unit: 'c.à.c.' },
      { name: 'Riz basmati', quantity: 300, unit: 'g' },
    ],
  },
  // ===== MAGHREB =====
  {
    name: 'Couscous express aux légumes',
    description: 'Un couscous rapide et gourmand avec des légumes mijotés.',
    instructions: 'Faire revenir oignon et ail.\nAjouter carottes, courgettes, pois chiches.\nCouvrir de bouillon, ajouter harissa.\nMijoter 20 minutes.\nPréparer la semoule avec de l\'eau bouillante.\nServir les légumes sur la semoule.',
    difficulty: 'MOYEN', prepTime: 35, cuisine: 'MA', servings: 4,
    ingredients: [
      { name: 'Semoule', quantity: 300, unit: 'g' }, { name: 'Carotte', quantity: 3, unit: 'pièces' },
      { name: 'Courgette', quantity: 2, unit: 'pièces' }, { name: 'Pois chiches', quantity: 250, unit: 'g' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' }, { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
      { name: 'Harissa', quantity: 1, unit: 'c.à.c.' },
    ],
  },
  {
    name: 'Tajine poulet citron olives',
    description: 'Un tajine parfumé au citron confit et aux olives vertes.',
    instructions: 'Faire dorer le poulet dans l\'huile.\nAjouter oignon émincé et ail.\nAssaisonner cumin, gingembre, sel.\nAjouter citron en quartiers et olives.\nCouvrir d\'eau et mijoter 40 minutes.\nParsemer de coriandre.\nServir avec de la semoule.',
    difficulty: 'MOYEN', prepTime: 50, cuisine: 'MA', servings: 4,
    ingredients: [
      { name: 'Poulet', quantity: 800, unit: 'g' }, { name: 'Citron', quantity: 2, unit: 'pièces' },
      { name: 'Olives', quantity: 100, unit: 'g' }, { name: 'Oignon', quantity: 2, unit: 'pièces' },
      { name: 'Cumin', quantity: 1, unit: 'c.à.c.' }, { name: 'Gingembre', quantity: 1, unit: 'c.à.c.' },
      { name: 'Coriandre', quantity: 1, unit: 'bouquet' }, { name: 'Semoule', quantity: 300, unit: 'g' },
    ],
  },
  // ===== ASIE =====
  {
    name: 'Pad thaï aux crevettes',
    description: 'Le célèbre plat thaïlandais de nouilles sautées aux crevettes.',
    instructions: 'Tremper les nouilles dans l\'eau chaude.\nSaisir les crevettes dans un wok.\nAjouter ail et œuf brouillé.\nAjouter les nouilles égouttées.\nSauce: nuoc-mâm, citron vert, sucre.\nSauter le tout à feu vif.\nServir avec cacahuètes.',
    difficulty: 'MOYEN', prepTime: 25, cuisine: 'TH', servings: 2,
    ingredients: [
      { name: 'Nouilles', quantity: 200, unit: 'g' }, { name: 'Crevettes', quantity: 200, unit: 'g' },
      { name: 'Œuf', quantity: 2, unit: 'pièces' }, { name: 'Ail', quantity: 2, unit: 'gousses' },
      { name: 'Nuoc-mâm', quantity: 2, unit: 'c.à.s.' }, { name: 'Citron vert', quantity: 1, unit: 'pièce' },
      { name: 'Sucre', quantity: 1, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Bo bun vietnamien',
    description: 'Salade froide vietnamienne avec bœuf mariné, vermicelles et légumes.',
    instructions: 'Mariner le bœuf dans sauce soja, ail, gingembre.\nCuire les nouilles et les refroidir.\nPréparer carottes râpées, concombre, salade.\nGriller le bœuf à la poêle.\nDisposer nouilles, légumes, bœuf.\nArroser de sauce nuoc-mâm dilué.\nParsemer de coriandre.',
    difficulty: 'MOYEN', prepTime: 30, cuisine: 'VN', servings: 2,
    ingredients: [
      { name: 'Steak', quantity: 250, unit: 'g' }, { name: 'Nouilles', quantity: 150, unit: 'g' },
      { name: 'Carotte', quantity: 1, unit: 'pièce' }, { name: 'Concombre', quantity: 1, unit: 'demi' },
      { name: 'Salade', quantity: 1, unit: 'pièce' }, { name: 'Sauce soja', quantity: 2, unit: 'c.à.s.' },
      { name: 'Nuoc-mâm', quantity: 2, unit: 'c.à.s.' }, { name: 'Coriandre', quantity: 1, unit: 'bouquet' },
    ],
  },
  {
    name: 'Riz cantonais',
    description: 'Le riz sauté à la chinoise avec œuf, jambon et petits pois.',
    instructions: 'Cuire le riz et le laisser refroidir.\nBrouiller les œufs dans un wok huilé.\nAjouter le jambon en dés.\nAjouter les petits pois.\nAjouter le riz froid et sauter à feu vif.\nAssaisonner sauce soja.\nServir chaud.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'CN', servings: 4,
    ingredients: [
      { name: 'Riz', quantity: 400, unit: 'g' }, { name: 'Œuf', quantity: 2, unit: 'pièces' },
      { name: 'Jambon', quantity: 100, unit: 'g' }, { name: 'Petits pois', quantity: 100, unit: 'g' },
      { name: 'Sauce soja', quantity: 2, unit: 'c.à.s.' }, { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Curry de légumes thaï',
    description: 'Un curry vert végétarien crémeux au lait de coco.',
    instructions: 'Couper les légumes en morceaux.\nFaire revenir curry et gingembre dans l\'huile.\nAjouter les légumes et sauter 3 min.\nVerser le lait de coco.\nMijoter 15 minutes.\nAjouter le basilic.\nServir avec du riz basmati.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'TH', servings: 4,
    ingredients: [
      { name: 'Lait de coco', quantity: 400, unit: 'ml' }, { name: 'Courgette', quantity: 1, unit: 'pièce' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' }, { name: 'Aubergine', quantity: 1, unit: 'pièce' },
      { name: 'Curry', quantity: 2, unit: 'c.à.s.' }, { name: 'Gingembre', quantity: 1, unit: 'c.à.c.' },
      { name: 'Basilic', quantity: 1, unit: 'bouquet' }, { name: 'Riz basmati', quantity: 300, unit: 'g' },
    ],
  },
  // ===== USA =====
  {
    name: 'Salade César au poulet',
    description: 'Salade croquante avec poulet grillé, croûtons et sauce César.',
    instructions: 'Griller le poulet assaisonné.\nPréparer la sauce: yaourt, moutarde, citron, parmesan.\nToaster des croûtons de pain.\nDisposer la salade, le poulet tranché.\nAjouter croûtons et napper de sauce.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'US', servings: 2,
    ingredients: [
      { name: 'Poulet', quantity: 250, unit: 'g' }, { name: 'Salade', quantity: 1, unit: 'pièce' },
      { name: 'Parmesan', quantity: 40, unit: 'g' }, { name: 'Pain', quantity: 2, unit: 'tranches' },
      { name: 'Yaourt', quantity: 2, unit: 'c.à.s.' }, { name: 'Moutarde', quantity: 1, unit: 'c.à.c.' },
      { name: 'Citron', quantity: 1, unit: 'demi' },
    ],
  },
  {
    name: 'Burger maison',
    description: 'Le burger classique avec steak juteux, fromage et tous les toppings.',
    instructions: 'Former des steaks avec le bœuf haché.\nGriller les steaks 3-4 min de chaque côté.\nAjouter le fromage et couvrir pour fondre.\nToaster les pains.\nMonter: pain, salade, tomate, steak, oignon.\nServir avec des frites maison.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'US', servings: 4,
    ingredients: [
      { name: 'Bœuf haché', quantity: 500, unit: 'g' }, { name: 'Pain', quantity: 4, unit: 'pièces' },
      { name: 'Fromage râpé', quantity: 100, unit: 'g' }, { name: 'Tomate', quantity: 1, unit: 'pièce' },
      { name: 'Salade', quantity: 4, unit: 'feuilles' }, { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ketchup', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Mac and cheese',
    description: 'Des macaronis au fromage fondant, le comfort food par excellence.',
    instructions: 'Cuire les pâtes al dente.\nFaire fondre le beurre, ajouter la farine.\nVerser le lait en fouettant.\nAjouter le fromage râpé et mélanger.\nMélanger avec les pâtes.\nMettre en plat, parsemer de chapelure.\nGratiner 10 min au four.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'US', servings: 4,
    ingredients: [
      { name: 'Pâtes', quantity: 400, unit: 'g' }, { name: 'Fromage râpé', quantity: 250, unit: 'g' },
      { name: 'Lait', quantity: 400, unit: 'ml' }, { name: 'Beurre', quantity: 40, unit: 'g' },
      { name: 'Farine', quantity: 30, unit: 'g' }, { name: 'Chapelure', quantity: 30, unit: 'g' },
    ],
  },
  // ===== ESPAGNE =====
  {
    name: 'Crevettes sautées à l\'ail',
    description: 'Des crevettes juteuses sautées à l\'ail et au persil.',
    instructions: 'Faire chauffer l\'huile d\'olive.\nAjouter l\'ail émincé 30 secondes.\nAjouter les crevettes 2-3 min de chaque côté.\nAssaisonner sel, poivre et citron.\nParsemer de persil et servir.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'ES', servings: 2,
    ingredients: [
      { name: 'Crevettes', quantity: 300, unit: 'g' }, { name: 'Ail', quantity: 4, unit: 'gousses' },
      { name: 'Persil', quantity: 1, unit: 'bouquet' }, { name: 'Citron', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Tortilla espagnole',
    description: 'L\'omelette aux pommes de terre, le tapas incontournable.',
    instructions: 'Couper les pommes de terre en fines rondelles.\nLes faire frire doucement dans l\'huile 15 min.\nBattre les œufs.\nMélanger pommes de terre et œufs.\nCuire dans une poêle 5 min de chaque côté.\nServir tiède en parts.',
    difficulty: 'MOYEN', prepTime: 30, cuisine: 'ES', servings: 4,
    ingredients: [
      { name: 'Pomme de terre', quantity: 500, unit: 'g' }, { name: 'Œuf', quantity: 6, unit: 'pièces' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' }, { name: 'Huile d\'olive', quantity: 100, unit: 'ml' },
    ],
  },
  {
    name: 'Gazpacho',
    description: 'La soupe froide espagnole aux tomates, rafraîchissante en été.',
    instructions: 'Couper les tomates, concombre, poivron.\nMixer avec l\'ail, le vinaigre et l\'huile d\'olive.\nAjouter du pain trempé pour épaissir.\nAssaisonner sel et poivre.\nRéfrigérer 2 heures.\nServir bien frais avec des croûtons.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'ES', servings: 4,
    ingredients: [
      { name: 'Tomate', quantity: 6, unit: 'pièces' }, { name: 'Concombre', quantity: 1, unit: 'pièce' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' }, { name: 'Ail', quantity: 1, unit: 'gousse' },
      { name: 'Vinaigre', quantity: 2, unit: 'c.à.s.' }, { name: 'Huile d\'olive', quantity: 4, unit: 'c.à.s.' },
      { name: 'Pain', quantity: 1, unit: 'tranche' },
    ],
  },
  // ===== GRECE / MOYEN-ORIENT =====
  {
    name: 'Salade grecque',
    description: 'Salade fraîche avec feta, olives, concombre et tomate.',
    instructions: 'Couper tomates et concombre en morceaux.\nÉmincer l\'oignon en fines rondelles.\nCouper la feta en dés.\nAssembler dans un saladier.\nAjouter les olives.\nAssaisonner huile d\'olive, origan, sel.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'GR', servings: 2,
    ingredients: [
      { name: 'Tomate', quantity: 3, unit: 'pièces' }, { name: 'Concombre', quantity: 1, unit: 'pièce' },
      { name: 'Feta', quantity: 150, unit: 'g' }, { name: 'Olives', quantity: 50, unit: 'g' },
      { name: 'Oignon', quantity: 1, unit: 'demi' }, { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Houmous maison',
    description: 'Le houmous crémeux aux pois chiches, tahini et citron.',
    instructions: 'Égoutter les pois chiches.\nMixer avec tahini, jus de citron et ail.\nAjouter l\'huile d\'olive petit à petit.\nAssaisonner sel et cumin.\nServir avec un filet d\'huile d\'olive et du paprika.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'LB', servings: 6,
    ingredients: [
      { name: 'Pois chiches', quantity: 400, unit: 'g' }, { name: 'Tahini', quantity: 3, unit: 'c.à.s.' },
      { name: 'Citron', quantity: 1, unit: 'pièce' }, { name: 'Ail', quantity: 1, unit: 'gousse' },
      { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' }, { name: 'Cumin', quantity: 1, unit: 'c.à.c.' },
    ],
  },
  {
    name: 'Taboulé libanais',
    description: 'Salade de persil, boulgour, tomates et citron, fraîche et herbacée.',
    instructions: 'Faire gonfler le boulgour dans l\'eau.\nHacher finement le persil et la menthe.\nCouper les tomates en petits dés.\nMélanger boulgour, herbes, tomates.\nAssaisonner citron, huile d\'olive, sel.\nRéfrigérer 30 min avant de servir.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'LB', servings: 4,
    ingredients: [
      { name: 'Boulgour', quantity: 100, unit: 'g' }, { name: 'Persil', quantity: 3, unit: 'bouquets' },
      { name: 'Tomate', quantity: 3, unit: 'pièces' }, { name: 'Citron', quantity: 2, unit: 'pièces' },
      { name: 'Huile d\'olive', quantity: 4, unit: 'c.à.s.' }, { name: 'Oignon', quantity: 1, unit: 'petit' },
    ],
  },
  // ===== RAPIDE / STREET FOOD =====
  {
    name: 'Tartine avocat œuf poché',
    description: 'La tartine healthy tendance, crémeuse et protéinée.',
    instructions: 'Toaster le pain.\nÉcraser l\'avocat avec sel, poivre et citron.\nFaire pocher l\'œuf dans l\'eau frémissante.\nTartiner le pain d\'avocat.\nPoser l\'œuf poché dessus.\nAssaisonner piment et graines.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'US', servings: 1,
    ingredients: [
      { name: 'Pain', quantity: 2, unit: 'tranches' }, { name: 'Avocat', quantity: 1, unit: 'pièce' },
      { name: 'Œuf', quantity: 1, unit: 'pièce' }, { name: 'Citron', quantity: 1, unit: 'demi' },
    ],
  },
  {
    name: 'Omelette aux champignons',
    description: 'Une omelette baveuse garnie de champignons poêlés.',
    instructions: 'Émincer et faire sauter les champignons dans le beurre.\nBattre les œufs avec sel et poivre.\nVerser dans une poêle chaude beurrée.\nQuand l\'omelette est prise dessous mais baveuse dessus.\nAjouter les champignons et replier.\nServir immédiatement.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'FR', servings: 2,
    ingredients: [
      { name: 'Œuf', quantity: 4, unit: 'pièces' }, { name: 'Champignon', quantity: 150, unit: 'g' },
      { name: 'Beurre', quantity: 20, unit: 'g' }, { name: 'Persil', quantity: 1, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Pâtes aglio olio',
    description: 'Pâtes à l\'ail et à l\'huile d\'olive, simple et délicieux.',
    instructions: 'Cuire les pâtes al dente.\nFaire dorer l\'ail émincé dans l\'huile d\'olive.\nAjouter le piment et le persil.\nMélanger avec les pâtes.\nAjouter un peu d\'eau de cuisson.\nServir avec du parmesan.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'IT', servings: 2,
    ingredients: [
      { name: 'Pâtes', quantity: 250, unit: 'g' }, { name: 'Ail', quantity: 4, unit: 'gousses' },
      { name: 'Huile d\'olive', quantity: 5, unit: 'c.à.s.' }, { name: 'Piment', quantity: 1, unit: 'pincée' },
      { name: 'Persil', quantity: 1, unit: 'bouquet' }, { name: 'Parmesan', quantity: 30, unit: 'g' },
    ],
  },
  {
    name: 'Saumon grillé et légumes',
    description: 'Pavé de saumon grillé servi avec des légumes rôtis.',
    instructions: 'Préchauffer le four à 200°C.\nDisposer courgettes et poivrons sur une plaque.\nPoser les pavés de saumon.\nArroser d\'huile d\'olive, citron, sel, poivre.\nEnfourner 20 minutes.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'FR', servings: 2,
    ingredients: [
      { name: 'Saumon', quantity: 2, unit: 'pavés' }, { name: 'Courgette', quantity: 1, unit: 'pièce' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' }, { name: 'Citron', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Bowl quinoa poulet avocat',
    description: 'Un bowl healthy et complet, riche en protéines.',
    instructions: 'Cuire le quinoa.\nGriller le poulet assaisonné.\nCouper l\'avocat en tranches.\nCouper la tomate en dés.\nAssembler dans un bol.\nArroser d\'huile d\'olive et citron.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'US', servings: 2,
    ingredients: [
      { name: 'Quinoa', quantity: 150, unit: 'g' }, { name: 'Poulet', quantity: 200, unit: 'g' },
      { name: 'Avocat', quantity: 1, unit: 'pièce' }, { name: 'Tomate', quantity: 1, unit: 'pièce' },
      { name: 'Citron', quantity: 1, unit: 'demi' }, { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Croques aux épinards et feta',
    description: 'Un croque revisité avec épinards fondants et feta.',
    instructions: 'Faire fondre les épinards à la poêle.\nTartiner le pain de beurre.\nDisposer épinards et feta émiettée.\nFermer le croque.\nCuire à la poêle ou au four 5 min de chaque côté.',
    difficulty: 'FACILE', prepTime: 15, cuisine: 'FR', servings: 2,
    ingredients: [
      { name: 'Pain de mie', quantity: 4, unit: 'tranches' }, { name: 'Épinards', quantity: 150, unit: 'g' },
      { name: 'Feta', quantity: 100, unit: 'g' }, { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Smoothie bowl mangue banane',
    description: 'Un bol vitaminé et coloré pour un petit-déjeuner sain.',
    instructions: 'Mixer la mangue, la banane et le yaourt.\nVerser dans un bol.\nGarnir de rondelles de banane, amandes et miel.\nDéguster immédiatement.',
    difficulty: 'FACILE', prepTime: 5, cuisine: 'US', servings: 1,
    ingredients: [
      { name: 'Mangue', quantity: 1, unit: 'pièce' }, { name: 'Banane', quantity: 1, unit: 'pièce' },
      { name: 'Yaourt', quantity: 150, unit: 'g' }, { name: 'Miel', quantity: 1, unit: 'c.à.s.' },
      { name: 'Amandes', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Grilled cheese tomate',
    description: 'Le sandwich grillé au fromage fondant avec tomate.',
    instructions: 'Beurrer les tranches de pain.\nAjouter le fromage et les rondelles de tomate.\nFermer le sandwich.\nCuire à la poêle 3 min de chaque côté.\nCouper en diagonale et servir.',
    difficulty: 'FACILE', prepTime: 10, cuisine: 'US', servings: 1,
    ingredients: [
      { name: 'Pain de mie', quantity: 2, unit: 'tranches' }, { name: 'Fromage râpé', quantity: 60, unit: 'g' },
      { name: 'Tomate', quantity: 1, unit: 'pièce' }, { name: 'Beurre', quantity: 15, unit: 'g' },
    ],
  },
  {
    name: 'Salade de lentilles',
    description: 'Salade de lentilles vertes avec feta, noix et vinaigrette.',
    instructions: 'Cuire les lentilles 20 minutes.\nLaisser refroidir.\nCouper la feta en dés.\nMélanger lentilles, feta, noix.\nVinaigrette: moutarde, vinaigre, huile.\nAssaisonner et servir.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'FR', servings: 4,
    ingredients: [
      { name: 'Lentilles', quantity: 250, unit: 'g' }, { name: 'Feta', quantity: 100, unit: 'g' },
      { name: 'Noix', quantity: 40, unit: 'g' }, { name: 'Moutarde', quantity: 1, unit: 'c.à.c.' },
      { name: 'Vinaigre', quantity: 1, unit: 'c.à.s.' }, { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Poke bowl saumon',
    description: 'Bowl hawaïen au saumon, riz, avocat et edamame.',
    instructions: 'Cuire le riz et le laisser refroidir.\nCouper le saumon en cubes.\nMariner dans sauce soja et gingembre.\nCouper l\'avocat en tranches.\nDisposer riz, saumon, avocat dans un bol.\nAssaisonner sauce soja et graines.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'JP', servings: 2,
    ingredients: [
      { name: 'Saumon', quantity: 200, unit: 'g' }, { name: 'Riz', quantity: 200, unit: 'g' },
      { name: 'Avocat', quantity: 1, unit: 'pièce' }, { name: 'Concombre', quantity: 1, unit: 'demi' },
      { name: 'Sauce soja', quantity: 2, unit: 'c.à.s.' }, { name: 'Gingembre', quantity: 1, unit: 'c.à.c.' },
    ],
  },
  {
    name: 'Patate douce farcie',
    description: 'Patate douce rôtie garnie de haricots, fromage et crème.',
    instructions: 'Piquer les patates douces et enfourner 45 min à 200°C.\nRéchauffer les haricots rouges.\nOuvrir les patates en deux.\nGarnir de haricots, crème fraîche et fromage.\nAssaisonner paprika et coriandre.',
    difficulty: 'FACILE', prepTime: 50, cuisine: 'US', servings: 2,
    ingredients: [
      { name: 'Patate douce', quantity: 2, unit: 'grosses' }, { name: 'Haricots rouges', quantity: 200, unit: 'g' },
      { name: 'Crème fraîche', quantity: 2, unit: 'c.à.s.' }, { name: 'Fromage râpé', quantity: 50, unit: 'g' },
      { name: 'Paprika', quantity: 1, unit: 'c.à.c.' }, { name: 'Coriandre', quantity: 1, unit: 'bouquet' },
    ],
  },
  {
    name: 'Feuilleté jambon fromage',
    description: 'Roulés feuilletés croustillants au jambon et fromage.',
    instructions: 'Dérouler la pâte feuilletée.\nÉtaler la moutarde.\nDisposer le jambon et le fromage râpé.\nRouler et couper en tronçons.\nBadigeonner d\'œuf battu.\nEnfourner 20 min à 200°C.',
    difficulty: 'FACILE', prepTime: 25, cuisine: 'FR', servings: 4,
    ingredients: [
      { name: 'Pâte feuilletée', quantity: 1, unit: 'pièce' }, { name: 'Jambon', quantity: 4, unit: 'tranches' },
      { name: 'Fromage râpé', quantity: 100, unit: 'g' }, { name: 'Moutarde', quantity: 1, unit: 'c.à.s.' },
      { name: 'Œuf', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    name: 'Shakshuka',
    description: 'Œufs pochés dans une sauce tomate épicée, spécialité du Moyen-Orient.',
    instructions: 'Faire revenir oignon et poivron dans l\'huile.\nAjouter ail, cumin, paprika.\nAjouter la sauce tomate et mijoter 10 min.\nCréer des puits et y casser les œufs.\nCouvrir et cuire 5-8 min.\nParsemer de persil et servir avec du pain.',
    difficulty: 'FACILE', prepTime: 20, cuisine: 'LB', servings: 2,
    ingredients: [
      { name: 'Œuf', quantity: 4, unit: 'pièces' }, { name: 'Sauce tomate', quantity: 400, unit: 'ml' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' }, { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousses' }, { name: 'Cumin', quantity: 1, unit: 'c.à.c.' },
      { name: 'Paprika', quantity: 1, unit: 'c.à.c.' }, { name: 'Pain', quantity: 1, unit: 'pièce' },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  const ingredientMap = new Map<string, string>();
  for (const ing of ingredients) {
    const created = await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { category: ing.category, emoji: ing.emoji },
      create: ing,
    });
    ingredientMap.set(created.name, created.id);
  }
  console.log(`${ingredientMap.size} ingredients`);

  let created = 0;
  for (const recipe of recipes) {
    const existing = await prisma.recipe.findFirst({ where: { name: recipe.name } });
    if (existing) continue;

    const r = await prisma.recipe.create({
      data: {
        name: recipe.name, description: recipe.description, instructions: recipe.instructions,
        difficulty: recipe.difficulty, prepTime: recipe.prepTime, cuisine: recipe.cuisine, servings: recipe.servings,
      },
    });

    for (const ing of recipe.ingredients) {
      const ingredientId = ingredientMap.get(ing.name);
      if (ingredientId) {
        await prisma.recipeIngredient.create({
          data: { recipeId: r.id, ingredientId, quantity: ing.quantity, unit: ing.unit },
        }).catch(() => {});
      }
    }
    created++;
  }
  console.log(`${created} new recipes (${recipes.length} total)`);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN', password: hashed },
      create: { email: adminEmail, name: 'Admin', password: hashed, role: 'ADMIN' },
    });
    console.log(`Admin: ${adminEmail}`);
  }

  console.log('Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
