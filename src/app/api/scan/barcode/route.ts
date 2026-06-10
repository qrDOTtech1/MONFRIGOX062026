import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { openfoodfacts_barcode } from '@/lib/food-apis';

// Catégorie à partir des catégories OFF
function guessCategory(categories: string, name: string): string {
  const all = (categories + ' ' + name).toLowerCase();
  if (all.match(/viande|boeuf|poulet|porc|agneau|dinde|veau/)) return 'Viandes';
  if (all.match(/poisson|saumon|cabillaud|thon|sardine|crevette|fruit.?de.?mer/)) return 'Poissons';
  if (all.match(/légume|carotte|tomate|courgette|épinard|brocoli|oignon|ail/)) return 'Légumes';
  if (all.match(/fruit|pomme|banane|fraise|raisin|orange|citron/)) return 'Fruits';
  if (all.match(/lait|fromage|beurre|crème|yaourt|oeuf/)) return 'Laitiers';
  if (all.match(/pain|pâte|riz|farine|céréale|biscuit|gâteau|viennoiserie/)) return 'Épicerie';
  if (all.match(/boisson|jus|soda|eau|café|thé/)) return 'Boissons';
  if (all.match(/conserve|sauce|huile|condiment|épice|sel|sucre|confiture/)) return 'Condiments';
  if (all.match(/surgelé|congelé/)) return 'Surgelés';
  if (all.match(/beurre.?cacahu|peanut.?butter|cacahu/)) return 'Épicerie';
  return 'Épicerie';
}

// Emoji rapide selon catégorie
function guessEmoji(category: string, name: string): string {
  const n = name.toLowerCase();
  if (n.includes('beurre de cacahu') || n.includes('peanut butter')) return '🥜';
  if (n.includes('chocolat') || n.includes('nutella')) return '🍫';
  if (n.includes('café')) return '☕';
  if (n.includes('thé')) return '🍵';
  if (n.includes('jus') || n.includes('juice')) return '🧃';
  if (n.includes('eau')) return '💧';
  if (n.includes('lait')) return '🥛';
  if (n.includes('beurre')) return '🧈';
  if (n.includes('fromage')) return '🧀';
  if (n.includes('pain')) return '🍞';
  if (n.includes('oeuf') || n.includes('egg')) return '🥚';
  const map: Record<string, string> = {
    'Viandes': '🥩', 'Poissons': '🐟', 'Légumes': '🥦', 'Fruits': '🍎',
    'Laitiers': '🧀', 'Épicerie': '🛒', 'Boissons': '🥤', 'Condiments': '🫙',
    'Surgelés': '🧊',
  };
  return map[category] ?? '🛒';
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { barcode } = await req.json();
  if (!barcode) return NextResponse.json({ error: 'Code-barres manquant' }, { status: 400 });

  const product = await openfoodfacts_barcode(String(barcode));
  if (!product || !product.name) {
    return NextResponse.json({ error: 'Produit introuvable — essaie un autre code-barres' }, { status: 404 });
  }

  // Nom propre : prend tout avant la première virgule, max 60 chars
  const cleanName = product.name.split(',')[0].trim().slice(0, 60);
  const words = cleanName.split(' ').filter(Boolean);

  // ── Recherche d'un ingrédient existant ──────────────────────────────────
  // 1. Correspondance exacte du nom complet
  // 2. Correspondance par code-barres
  // 3. Correspondance sur les 2 premiers mots (pour variantes de marques)
  // 4. Correspondance sur le premier mot seulement SI court (≤6 chars → probablement catégorie générique)
  let existing = await prisma.ingredient.findFirst({
    where: { name: { equals: cleanName, mode: 'insensitive' } },
  });

  if (!existing && barcode) {
    existing = await prisma.ingredient.findFirst({ where: { barcode: String(barcode) } });
  }

  if (!existing && words.length >= 2) {
    existing = await prisma.ingredient.findFirst({
      where: { name: { contains: words.slice(0, 2).join(' '), mode: 'insensitive' } },
    });
  }

  // Correspondance premier mot UNIQUEMENT si le premier mot est très spécifique (>6 chars ET pas un mot générique)
  const genericWords = ['beurre', 'sauce', 'crème', 'soupe', 'purée', 'pâte', 'pain', 'jus', 'eau'];
  if (!existing && words.length >= 1 && words[0].length > 6 && !genericWords.includes(words[0].toLowerCase())) {
    existing = await prisma.ingredient.findFirst({
      where: { name: { contains: words[0], mode: 'insensitive' } },
    });
  }

  const nutrients = product.nutrients ?? {};
  const nutritionData = {
    kcal:      nutrients.calories   || null,
    protein:   nutrients.protein    || null,
    fat:       nutrients.fat        || null,
    carbs:     nutrients.carbs      || null,
    fiber:     nutrients.fiber      || null,
    salt:      nutrients.salt       || null,
    nutriScore: product.nutriScore  || '',
  };

  // ── Si pas trouvé → créer automatiquement l'ingrédient ──────────────────
  if (!existing) {
    const category = guessCategory(product.categories ?? '', cleanName);
    const emoji    = guessEmoji(category, cleanName);
    try {
      existing = await prisma.ingredient.create({
        data: {
          name:     cleanName,
          category,
          emoji,
          imageUrl: product.imageUrl ?? '',
          brands:   product.brands   ?? '',
          barcode:  String(barcode),
          ...nutritionData,
        },
      });
    } catch {
      existing = await prisma.ingredient.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } },
      });
    }
  } else {
    // Mettre à jour les champs manquants (image, nutrition, barcode)
    const needsUpdate =
      !existing.imageUrl || !existing.barcode ||
      existing.kcal === null || existing.kcal === undefined;
    if (needsUpdate) {
      await prisma.ingredient.update({
        where: { id: existing.id },
        data: {
          imageUrl:  existing.imageUrl  || product.imageUrl  || '',
          barcode:   existing.barcode   || String(barcode),
          brands:    existing.brands    || product.brands    || '',
          ...(existing.kcal == null ? nutritionData : {}),
        },
      });
    }
  }

  return NextResponse.json({
    barcode,
    name:          product.name,
    brands:        product.brands,
    imageUrl:      product.imageUrl,
    nutriScore:    product.nutriScore,
    nutrients:     product.nutrients,
    ingredientId:  existing?.id   ?? null,
    ingredientName: existing?.name ?? null,
  });
}
