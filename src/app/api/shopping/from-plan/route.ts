import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/shopping/from-plan
// body: { startDate: "2026-06-09", endDate: "2026-06-15" }
// Returns merged ingredient list from all meal plans in range, grouped by category
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { startDate, endDate } = await req.json();

  // Load all meal plans in range with their ingredients
  const plans = await prisma.mealPlan.findMany({
    where: {
      userId: user.id,
      date: {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    },
    include: {
      recipe: {
        select: {
          name: true,
          servings: true,
          ingredients: {
            include: {
              ingredient: { select: { id: true, name: true, emoji: true, category: true } },
            },
          },
        },
      },
    },
  });

  // Merge ingredients by (ingredientId, unit)
  const mergeMap = new Map<
    string, // `${ingredientId}|${unit}`
    {
      ingredient: { id: string; name: string; emoji: string; category: string };
      unit: string;
      totalQty: number;
      recipes: string[];
    }
  >();

  for (const plan of plans) {
    for (const ri of plan.recipe.ingredients) {
      const unit = ri.unit || 'unité';
      const key = `${ri.ingredientId}|${unit}`;
      if (!mergeMap.has(key)) {
        mergeMap.set(key, {
          ingredient: ri.ingredient,
          unit,
          totalQty: 0,
          recipes: [],
        });
      }
      const entry = mergeMap.get(key)!;
      entry.totalQty += ri.quantity;
      if (!entry.recipes.includes(plan.recipe.name)) {
        entry.recipes.push(plan.recipe.name);
      }
    }
  }

  // Get user's fridge items for deduction display
  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: true },
  });
  const fridgeMap = new Map(fridgeItems.map(f => [f.ingredientId, f]));

  // Group by category
  type ShoppingEntry = {
    ingredientId: string;
    name: string;
    emoji: string;
    qty: number;
    unit: string;
    recipes: string[];
    inFridge: boolean;
    fridgeQty?: number;
    fridgeUnit?: string;
  };

  const categories: Record<string, ShoppingEntry[]> = {};

  for (const entry of mergeMap.values()) {
    const cat = entry.ingredient.category || 'Autre';
    if (!categories[cat]) categories[cat] = [];
    const fridgeItem = fridgeMap.get(entry.ingredient.id);
    categories[cat].push({
      ingredientId: entry.ingredient.id,
      name: entry.ingredient.name,
      emoji: entry.ingredient.emoji,
      qty: Math.round(entry.totalQty * 10) / 10,
      unit: entry.unit,
      recipes: entry.recipes,
      inFridge: !!fridgeItem,
      fridgeQty: fridgeItem?.quantity,
      fridgeUnit: fridgeItem?.unit,
    });
  }

  // Sort each category alphabetically
  for (const cat of Object.keys(categories)) {
    categories[cat].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  const totalItems = Array.from(mergeMap.values()).length;
  const inFridgeCount = Array.from(mergeMap.values()).filter(e => fridgeMap.has(e.ingredient.id)).length;

  return NextResponse.json({
    categories,
    totalItems,
    inFridgeCount,
    missingCount: totalItems - inFridgeCount,
    planCount: plans.length,
  });
}
