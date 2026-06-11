import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { estimateMicronutrients, MICRO_AJR } from '@/lib/micronutrients';

// GET /api/recipes/[id]/nutrition-ean
// Calculates nutrition from real EAN-scanned ingredient data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      servings: true,
      calories: true,
      ingredients: {
        include: {
          ingredient: {
            select: {
              id: true, name: true, emoji: true, category: true,
              kcal: true, protein: true, fat: true, carbs: true, fiber: true, salt: true,
              iron: true, magnesium: true, calcium: true, potassium: true, zinc: true,
              vitaminC: true, vitaminD: true, vitaminB12: true, vitaminB9: true,
              omega3: true, phosphorus: true, selenium: true, iodine: true,
            },
          },
        },
      },
    },
  });
  if (!recipe) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Only ingredients with EAN nutrition data (kcal not null)
  const withData = recipe.ingredients.filter(ri => ri.ingredient.kcal != null);
  const total = recipe.ingredients.length;

  if (withData.length === 0) {
    return NextResponse.json({
      available: false,
      coverage: 0,
      message: 'Aucun ingrédient avec données EAN scannées',
    });
  }

  // Convert quantity+unit to grams estimate for calculation
  function toGrams(qty: number, unit: string): number {
    const u = unit.toLowerCase().trim();
    if (['g', 'gr', 'gramme', 'grammes'].some(x => u === x)) return qty;
    if (['kg'].includes(u)) return qty * 1000;
    if (['ml', 'millilitre'].some(x => u === x)) return qty;
    if (['l', 'litre'].some(x => u === x)) return qty * 1000;
    if (['cs', 'c.à.s.', 'cuillère à soupe'].some(x => u.includes(x))) return qty * 15;
    if (['cc', 'c.à.c.', 'cuillère à café'].some(x => u.includes(x))) return qty * 5;
    if (['pincée', 'pincees'].some(x => u.includes(x))) return qty * 0.5;
    if (['pièce', 'piece', 'unité'].some(x => u.includes(x))) return qty * 100; // rough estimate
    if (['gousse', 'gousses'].some(x => u.includes(x))) return qty * 5;
    if (['tranche', 'tranches'].some(x => u.includes(x))) return qty * 30;
    return qty * 100; // fallback
  }

  let kcal = 0, protein = 0, fat = 0, carbs = 0, fiber = 0, salt = 0;

  const breakdown: Array<{ name: string; emoji: string; kcal: number; hasData: boolean }> = [];

  for (const ri of recipe.ingredients) {
    const ing = ri.ingredient;
    const grams = toGrams(ri.quantity, ri.unit);
    const factor = grams / 100; // nutrition values are per 100g

    if (ing.kcal != null) {
      const ingKcal = (ing.kcal ?? 0) * factor;
      kcal += ingKcal;
      protein += (ing.protein ?? 0) * factor;
      fat += (ing.fat ?? 0) * factor;
      carbs += (ing.carbs ?? 0) * factor;
      fiber += (ing.fiber ?? 0) * factor;
      salt += (ing.salt ?? 0) * factor;
      breakdown.push({ name: ing.name, emoji: ing.emoji, kcal: Math.round(ingKcal), hasData: true });
    } else {
      breakdown.push({ name: ing.name, emoji: ing.emoji, kcal: 0, hasData: false });
    }
  }

  const servings = recipe.servings || 1;

  // Micronutrients
  const microIngredients = recipe.ingredients.map(ri => ({
    name: ri.ingredient.name,
    quantityGrams: toGrams(ri.quantity, ri.unit),
    eanData: ri.ingredient.iron != null ? {
      iron: ri.ingredient.iron, magnesium: ri.ingredient.magnesium,
      calcium: ri.ingredient.calcium, potassium: ri.ingredient.potassium,
      zinc: ri.ingredient.zinc, vitaminC: ri.ingredient.vitaminC,
      vitaminD: ri.ingredient.vitaminD, vitaminB12: ri.ingredient.vitaminB12,
      vitaminB9: ri.ingredient.vitaminB9, omega3: ri.ingredient.omega3,
      phosphorus: ri.ingredient.phosphorus, selenium: ri.ingredient.selenium,
      iodine: ri.ingredient.iodine,
    } : undefined,
  }));
  const micros = estimateMicronutrients(microIngredients, servings);

  return NextResponse.json({
    available: true,
    coverage: Math.round((withData.length / total) * 100),
    coveredCount: withData.length,
    totalCount: total,
    perServing: {
      kcal: Math.round(kcal / servings),
      protein: +(protein / servings).toFixed(1),
      fat: +(fat / servings).toFixed(1),
      carbs: +(carbs / servings).toFixed(1),
      fiber: +(fiber / servings).toFixed(1),
      salt: +(salt / servings).toFixed(1),
    },
    totalRecipe: {
      kcal: Math.round(kcal),
      protein: +protein.toFixed(1),
      fat: +fat.toFixed(1),
      carbs: +carbs.toFixed(1),
    },
    breakdown: breakdown.sort((a, b) => b.kcal - a.kcal),
    aiEstimate: recipe.calories,
    micros,
    microAjr: MICRO_AJR,
  });
}
