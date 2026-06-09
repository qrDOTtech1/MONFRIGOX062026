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
  // Fruits
  { name: 'Pomme', category: 'Fruits', emoji: '🍎' },
  { name: 'Banane', category: 'Fruits', emoji: '🍌' },
  { name: 'Citron', category: 'Fruits', emoji: '🍋' },
  { name: 'Orange', category: 'Fruits', emoji: '🍊' },
  { name: 'Fraise', category: 'Fruits', emoji: '🍓' },
  { name: 'Avocat', category: 'Fruits', emoji: '🥑' },
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
  // Viandes & Poissons
  { name: 'Poulet', category: 'Viandes', emoji: '🍗' },
  { name: 'Bœuf haché', category: 'Viandes', emoji: '🥩' },
  { name: 'Lardons', category: 'Viandes', emoji: '🥓' },
  { name: 'Jambon', category: 'Viandes', emoji: '🍖' },
  { name: 'Saumon', category: 'Poissons', emoji: '🐟' },
  { name: 'Thon', category: 'Poissons', emoji: '🐟' },
  { name: 'Crevettes', category: 'Poissons', emoji: '🦐' },
  // Féculents & Céréales
  { name: 'Pâtes', category: 'Féculents', emoji: '🍝' },
  { name: 'Riz', category: 'Féculents', emoji: '🍚' },
  { name: 'Pain', category: 'Féculents', emoji: '🍞' },
  { name: 'Farine', category: 'Féculents', emoji: '🌾' },
  { name: 'Gnocchi', category: 'Féculents', emoji: '🥟' },
  { name: 'Tortilla', category: 'Féculents', emoji: '🫓' },
  { name: 'Pain de mie', category: 'Féculents', emoji: '🍞' },
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
  // Autres
  { name: 'Sucre', category: 'Autres', emoji: '🍬' },
  { name: 'Chocolat', category: 'Autres', emoji: '🍫' },
  { name: 'Miel', category: 'Autres', emoji: '🍯' },
  { name: 'Noix', category: 'Autres', emoji: '🥜' },
  { name: 'Lait de coco', category: 'Autres', emoji: '🥥' },
  { name: 'Bouillon cube', category: 'Autres', emoji: '🧊' },
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
  {
    name: 'Quiche sans pâte au brocoli',
    description: 'Une quiche légère et rapide sans pâte, garnie de brocoli fondant et de gruyère.',
    instructions: 'Préchauffer le four à 180°C.\nCouper le brocoli en petits bouquets et le faire cuire 5 min à la vapeur.\nBattre les œufs avec la crème fraîche, le sel et le poivre.\nBeurrer un moule et y disposer le brocoli.\nVerser le mélange œufs-crème et parsemer de gruyère.\nEnfourner 25 minutes jusqu\'à ce que ce soit doré.',
    difficulty: 'FACILE',
    prepTime: 25,
    cuisine: 'FR',
    servings: 4,
    ingredients: [
      { name: 'Brocoli', quantity: 1, unit: 'tête' },
      { name: 'Œuf', quantity: 4, unit: 'pièces' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Gruyère', quantity: 100, unit: 'g' },
      { name: 'Beurre', quantity: 10, unit: 'g' },
    ],
  },
  {
    name: 'Gnocchi au gruyère fondu',
    description: 'Des gnocchi dorés nappés d\'une sauce crémeuse au gruyère fondant.',
    instructions: 'Faire cuire les gnocchi dans l\'eau bouillante salée jusqu\'à ce qu\'ils remontent.\nDans une poêle, faire fondre le beurre et y faire revenir les gnocchi jusqu\'à ce qu\'ils soient dorés.\nAjouter la crème fraîche et le gruyère râpé.\nMélanger jusqu\'à obtenir une sauce onctueuse.\nAssaisonner et servir chaud.',
    difficulty: 'MOYEN',
    prepTime: 35,
    cuisine: 'IT',
    servings: 4,
    ingredients: [
      { name: 'Gnocchi', quantity: 500, unit: 'g' },
      { name: 'Gruyère', quantity: 150, unit: 'g' },
      { name: 'Crème fraîche', quantity: 150, unit: 'ml' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Poivre', quantity: 1, unit: 'pincée' },
    ],
  },
  {
    name: 'Omelette street food façon Tokyo',
    description: 'Une omelette japonaise roulée, moelleuse et légèrement sucrée, garnie de sauce soja.',
    instructions: 'Battre les œufs avec une pincée de sucre et la sauce soja.\nHuiler une poêle antiadhésive à feu moyen.\nVerser une fine couche d\'œuf et la rouler quand elle est à peine prise.\nRépéter en ajoutant de fines couches.\nCouper en tranches et servir avec du riz.',
    difficulty: 'FACILE',
    prepTime: 10,
    cuisine: 'JP',
    servings: 2,
    ingredients: [
      { name: 'Œuf', quantity: 4, unit: 'pièces' },
      { name: 'Sauce soja', quantity: 1, unit: 'c.à.s.' },
      { name: 'Sucre', quantity: 1, unit: 'c.à.c.' },
      { name: 'Huile d\'olive', quantity: 1, unit: 'c.à.s.' },
      { name: 'Riz', quantity: 200, unit: 'g' },
    ],
  },
  {
    name: 'Pâtes carbonara',
    description: 'La vraie recette italienne avec lardons, œufs et parmesan — sans crème!',
    instructions: 'Faire cuire les pâtes al dente.\nFaire revenir les lardons dans une poêle sans matière grasse.\nBattre les œufs avec le parmesan râpé et du poivre.\nÉgoutter les pâtes et les ajouter aux lardons hors du feu.\nVerser le mélange œufs-parmesan et mélanger vivement.\nServir immédiatement.',
    difficulty: 'FACILE',
    prepTime: 20,
    cuisine: 'IT',
    servings: 4,
    ingredients: [
      { name: 'Pâtes', quantity: 400, unit: 'g' },
      { name: 'Lardons', quantity: 200, unit: 'g' },
      { name: 'Œuf', quantity: 3, unit: 'pièces' },
      { name: 'Parmesan', quantity: 80, unit: 'g' },
      { name: 'Poivre', quantity: 1, unit: 'pincée' },
    ],
  },
  {
    name: 'Curry de poulet express',
    description: 'Un curry crémeux et parfumé prêt en 25 minutes, avec du lait de coco.',
    instructions: 'Couper le poulet en morceaux.\nFaire revenir l\'oignon et l\'ail dans l\'huile.\nAjouter le poulet et le faire dorer.\nSaupoudrer de curry et mélanger.\nVerser le lait de coco et la sauce tomate.\nLaisser mijoter 15 minutes.\nServir avec du riz.',
    difficulty: 'FACILE',
    prepTime: 25,
    cuisine: 'IN',
    servings: 4,
    ingredients: [
      { name: 'Poulet', quantity: 500, unit: 'g' },
      { name: 'Lait de coco', quantity: 400, unit: 'ml' },
      { name: 'Curry', quantity: 2, unit: 'c.à.s.' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 2, unit: 'gousses' },
      { name: 'Sauce tomate', quantity: 2, unit: 'c.à.s.' },
      { name: 'Riz', quantity: 300, unit: 'g' },
    ],
  },
  {
    name: 'Croque-monsieur',
    description: 'Le classique français: jambon, gruyère et béchamel entre deux tranches de pain.',
    instructions: 'Tartiner le pain de mie de beurre.\nDéposer une tranche de jambon et du gruyère râpé.\nRefermer avec la deuxième tranche.\nBadigeonner le dessus de beurre fondu et de gruyère.\nPasser au four à 200°C pendant 10 minutes.',
    difficulty: 'FACILE',
    prepTime: 15,
    cuisine: 'FR',
    servings: 2,
    ingredients: [
      { name: 'Pain de mie', quantity: 4, unit: 'tranches' },
      { name: 'Jambon', quantity: 2, unit: 'tranches' },
      { name: 'Gruyère', quantity: 100, unit: 'g' },
      { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Salade César au poulet',
    description: 'Salade croquante avec poulet grillé, croûtons, parmesan et sauce César maison.',
    instructions: 'Griller le poulet assaisonné dans une poêle.\nCouper la salade et disposer dans un plat.\nPréparer la sauce: mélanger yaourt, moutarde, citron et parmesan.\nCouper le pain en dés et les toaster au four.\nDisposer le poulet tranché, les croûtons et napper de sauce.',
    difficulty: 'FACILE',
    prepTime: 20,
    cuisine: 'US',
    servings: 2,
    ingredients: [
      { name: 'Poulet', quantity: 250, unit: 'g' },
      { name: 'Salade', quantity: 1, unit: 'pièce' },
      { name: 'Parmesan', quantity: 40, unit: 'g' },
      { name: 'Pain', quantity: 2, unit: 'tranches' },
      { name: 'Yaourt', quantity: 2, unit: 'c.à.s.' },
      { name: 'Moutarde', quantity: 1, unit: 'c.à.c.' },
      { name: 'Citron', quantity: 1, unit: 'demi' },
    ],
  },
  {
    name: 'Ratatouille provençale',
    description: 'Un grand classique du sud de la France, coloré et savoureux.',
    instructions: 'Couper tous les légumes en dés.\nFaire revenir l\'oignon et l\'ail dans l\'huile d\'olive.\nAjouter les poivrons et les aubergines, cuire 5 min.\nAjouter les courgettes et les tomates.\nAssaisonner avec les herbes de Provence, sel et poivre.\nLaisser mijoter 30 minutes à feu doux.',
    difficulty: 'MOYEN',
    prepTime: 45,
    cuisine: 'FR',
    servings: 6,
    ingredients: [
      { name: 'Tomate', quantity: 4, unit: 'pièces' },
      { name: 'Courgette', quantity: 2, unit: 'pièces' },
      { name: 'Aubergine', quantity: 1, unit: 'pièce' },
      { name: 'Poivron', quantity: 2, unit: 'pièces' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Ail', quantity: 3, unit: 'gousses' },
      { name: 'Herbes de Provence', quantity: 2, unit: 'c.à.c.' },
      { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Wrap poulet-avocat',
    description: 'Un wrap frais et gourmand, parfait pour un déjeuner rapide.',
    instructions: 'Griller le poulet et le couper en lamelles.\nÉcraser l\'avocat avec du citron et du sel.\nTartiner la tortilla avec l\'avocat écrasé.\nAjouter le poulet, la tomate en rondelles et la salade.\nRouler serré et couper en deux.',
    difficulty: 'FACILE',
    prepTime: 15,
    cuisine: 'MX',
    servings: 2,
    ingredients: [
      { name: 'Tortilla', quantity: 2, unit: 'pièces' },
      { name: 'Poulet', quantity: 200, unit: 'g' },
      { name: 'Avocat', quantity: 1, unit: 'pièce' },
      { name: 'Tomate', quantity: 1, unit: 'pièce' },
      { name: 'Salade', quantity: 3, unit: 'feuilles' },
      { name: 'Citron', quantity: 1, unit: 'demi' },
    ],
  },
  {
    name: 'Risotto aux champignons',
    description: 'Un risotto onctueux et crémeux aux champignons de Paris et au parmesan.',
    instructions: 'Faire revenir l\'oignon dans le beurre.\nAjouter le riz et le faire nacrer 2 minutes.\nAjouter le bouillon cube dissous dans l\'eau chaude, louche par louche.\nDans une autre poêle, faire sauter les champignons.\nQuand le riz est cuit, incorporer les champignons, le parmesan et un peu de beurre.\nServir crémeux.',
    difficulty: 'MOYEN',
    prepTime: 35,
    cuisine: 'IT',
    servings: 4,
    ingredients: [
      { name: 'Riz', quantity: 300, unit: 'g' },
      { name: 'Champignon', quantity: 250, unit: 'g' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Parmesan', quantity: 60, unit: 'g' },
      { name: 'Beurre', quantity: 40, unit: 'g' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    name: 'Tacos au bœuf épicé',
    description: 'Des tacos croustillants garnis de bœuf haché épicé, tomate et fromage.',
    instructions: 'Faire revenir le bœuf haché avec l\'oignon émincé.\nAjouter le paprika, le curry et la sauce tomate.\nLaisser cuire 10 minutes.\nGarnir les tortillas avec la viande, la tomate en dés et le fromage râpé.\nServir avec de la salade.',
    difficulty: 'FACILE',
    prepTime: 20,
    cuisine: 'MX',
    servings: 4,
    ingredients: [
      { name: 'Bœuf haché', quantity: 400, unit: 'g' },
      { name: 'Tortilla', quantity: 8, unit: 'pièces' },
      { name: 'Tomate', quantity: 2, unit: 'pièces' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Fromage râpé', quantity: 100, unit: 'g' },
      { name: 'Paprika', quantity: 1, unit: 'c.à.c.' },
      { name: 'Sauce tomate', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Saumon grillé et légumes',
    description: 'Pavé de saumon grillé servi avec des légumes de saison rôtis.',
    instructions: 'Préchauffer le four à 200°C.\nCouper les courgettes et les poivrons en morceaux.\nDisposer les légumes sur une plaque, arroser d\'huile d\'olive.\nPoser les pavés de saumon par-dessus, saler, poivrer, citronner.\nEnfourner 20 minutes.',
    difficulty: 'FACILE',
    prepTime: 25,
    cuisine: 'FR',
    servings: 2,
    ingredients: [
      { name: 'Saumon', quantity: 2, unit: 'pavés' },
      { name: 'Courgette', quantity: 1, unit: 'pièce' },
      { name: 'Poivron', quantity: 1, unit: 'pièce' },
      { name: 'Citron', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Pâtes au pesto maison',
    description: 'Des pâtes al dente nappées d\'un pesto frais fait maison au basilic.',
    instructions: 'Faire cuire les pâtes al dente.\nMixer le basilic, l\'ail, les noix, le parmesan et l\'huile d\'olive.\nÉgoutter les pâtes en gardant un peu d\'eau de cuisson.\nMélanger les pâtes avec le pesto, ajouter un peu d\'eau si nécessaire.\nServir avec du parmesan supplémentaire.',
    difficulty: 'FACILE',
    prepTime: 15,
    cuisine: 'IT',
    servings: 4,
    ingredients: [
      { name: 'Pâtes', quantity: 400, unit: 'g' },
      { name: 'Basilic', quantity: 1, unit: 'bouquet' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
      { name: 'Ail', quantity: 1, unit: 'gousse' },
      { name: 'Noix', quantity: 30, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 4, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Gratin dauphinois',
    description: 'Le gratin de pommes de terre crémeux et doré, un classique indémodable.',
    instructions: 'Préchauffer le four à 180°C.\nÉplucher et couper les pommes de terre en fines rondelles.\nFrotter un plat à gratin avec l\'ail et le beurrer.\nDisposer les pommes de terre en couches.\nMélanger le lait et la crème, assaisonner.\nVerser sur les pommes de terre.\nEnfourner 1h à 1h15.',
    difficulty: 'MOYEN',
    prepTime: 75,
    cuisine: 'FR',
    servings: 6,
    ingredients: [
      { name: 'Pomme de terre', quantity: 1, unit: 'kg' },
      { name: 'Crème fraîche', quantity: 200, unit: 'ml' },
      { name: 'Lait', quantity: 300, unit: 'ml' },
      { name: 'Ail', quantity: 2, unit: 'gousses' },
      { name: 'Beurre', quantity: 20, unit: 'g' },
    ],
  },
  {
    name: 'Crevettes sautées à l\'ail',
    description: 'Des crevettes juteuses sautées à l\'ail et au persil, prêtes en 10 minutes.',
    instructions: 'Faire chauffer l\'huile d\'olive dans une poêle.\nAjouter l\'ail émincé et cuire 30 secondes.\nAjouter les crevettes et cuire 2-3 min de chaque côté.\nAssaisonner de sel, poivre et citron.\nParsemer de persil frais et servir.',
    difficulty: 'FACILE',
    prepTime: 10,
    cuisine: 'ES',
    servings: 2,
    ingredients: [
      { name: 'Crevettes', quantity: 300, unit: 'g' },
      { name: 'Ail', quantity: 4, unit: 'gousses' },
      { name: 'Persil', quantity: 1, unit: 'bouquet' },
      { name: 'Citron', quantity: 1, unit: 'pièce' },
      { name: 'Huile d\'olive', quantity: 3, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Soupe de légumes maison',
    description: 'Une soupe réconfortante avec les légumes du frigo, parfaite pour ne rien gaspiller.',
    instructions: 'Éplucher et couper tous les légumes en morceaux.\nFaire revenir l\'oignon dans un peu d\'huile.\nAjouter tous les légumes et le bouillon cube avec de l\'eau.\nLaisser cuire 25 minutes.\nMixer selon la texture souhaitée.\nAssaisonner et servir chaud.',
    difficulty: 'FACILE',
    prepTime: 30,
    cuisine: 'FR',
    servings: 4,
    ingredients: [
      { name: 'Carotte', quantity: 3, unit: 'pièces' },
      { name: 'Pomme de terre', quantity: 2, unit: 'pièces' },
      { name: 'Courgette', quantity: 1, unit: 'pièce' },
      { name: 'Oignon', quantity: 1, unit: 'pièce' },
      { name: 'Bouillon cube', quantity: 1, unit: 'pièce' },
    ],
  },
  {
    name: 'Pizza maison express',
    description: 'Une pizza maison rapide avec une pâte minute, garnie selon tes envies.',
    instructions: 'Mélanger la farine, la levure, l\'huile d\'olive et l\'eau tiède.\nPétrir 5 minutes et étaler sur une plaque.\nÉtaler la sauce tomate.\nAjouter la mozzarella, le jambon et les champignons.\nEnfourner à 220°C pendant 15 minutes.',
    difficulty: 'MOYEN',
    prepTime: 30,
    cuisine: 'IT',
    servings: 4,
    ingredients: [
      { name: 'Farine', quantity: 300, unit: 'g' },
      { name: 'Sauce tomate', quantity: 200, unit: 'ml' },
      { name: 'Mozzarella', quantity: 200, unit: 'g' },
      { name: 'Jambon', quantity: 4, unit: 'tranches' },
      { name: 'Champignon', quantity: 150, unit: 'g' },
      { name: 'Huile d\'olive', quantity: 2, unit: 'c.à.s.' },
    ],
  },
  {
    name: 'Mousse au chocolat',
    description: 'La mousse au chocolat fondante et aérienne, un dessert incontournable.',
    instructions: 'Faire fondre le chocolat au bain-marie avec le beurre.\nSéparer les blancs des jaunes.\nMélanger les jaunes avec le chocolat fondu.\nMonter les blancs en neige ferme avec une pincée de sucre.\nIncorporer délicatement les blancs au chocolat.\nRéfrigérer 4 heures minimum.',
    difficulty: 'MOYEN',
    prepTime: 20,
    cuisine: 'FR',
    servings: 6,
    ingredients: [
      { name: 'Chocolat', quantity: 200, unit: 'g' },
      { name: 'Œuf', quantity: 6, unit: 'pièces' },
      { name: 'Beurre', quantity: 30, unit: 'g' },
      { name: 'Sucre', quantity: 30, unit: 'g' },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // Create ingredients
  const ingredientMap = new Map<string, string>();
  for (const ing of ingredients) {
    const created = await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { category: ing.category, emoji: ing.emoji },
      create: ing,
    });
    ingredientMap.set(created.name, created.id);
  }
  console.log(`Created ${ingredientMap.size} ingredients`);

  // Create recipes
  for (const recipe of recipes) {
    const existing = await prisma.recipe.findFirst({ where: { name: recipe.name } });
    if (existing) continue;

    const created = await prisma.recipe.create({
      data: {
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        cuisine: recipe.cuisine,
        servings: recipe.servings,
      },
    });

    for (const ing of recipe.ingredients) {
      const ingredientId = ingredientMap.get(ing.name);
      if (ingredientId) {
        await prisma.recipeIngredient.create({
          data: {
            recipeId: created.id,
            ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
          },
        });
      }
    }
  }
  console.log(`Created ${recipes.length} recipes`);

  // Create admin user if ADMIN_EMAIL and ADMIN_PASSWORD are set
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN', password: hashed },
      create: { email: adminEmail, name: 'Admin', password: hashed, role: 'ADMIN' },
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  console.log('Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
