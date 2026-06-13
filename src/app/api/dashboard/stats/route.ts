import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { estimateRecipeCost } from '@/lib/recipe-cost';
import { countSeasonalIngredients } from '@/lib/seasonal';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') || 'week';
  const now = new Date();

  let start: Date;
  let end: Date = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === 'day') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    const dow = now.getDay() === 0 ? -6 : 1 - now.getDay();
    start = new Date(now);
    start.setDate(now.getDate() + dow);
    start.setHours(0, 0, 0, 0);
  }

  const plans = await prisma.mealPlan.findMany({
    where: { userId: user.id, date: { gte: start, lte: end } },
    include: {
      recipe: {
        select: {
          calories: true, protein: true, servings: true, cuisine: true, prepTime: true,
          ingredients: { select: { quantity: true, unit: true, ingredient: { select: { name: true } } } },
        },
      },
    },
  });

  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: { select: { name: true } } },
  });

  const totalFridge = fridgeItems.length;
  const usedNames = new Set(plans.flatMap(p => p.recipe.ingredients.map(i => i.ingredient.name.toLowerCase())));
  const fridgeUsed = fridgeItems.filter(f => usedNames.has(f.ingredient.name.toLowerCase())).length;
  const fridgeUsePercent = totalFridge > 0 ? Math.round((fridgeUsed / totalFridge) * 100) : 0;

  const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const daysPlanned = new Set(plans.map(p => p.date.toISOString().split('T')[0])).size;

  const weekKcal = plans.reduce((s, p) => s + (p.recipe.calories || 0), 0);
  const weekProtein = plans.reduce((s, p) => s + (p.recipe.protein || 0), 0);
  const calorieScore = plans.length > 0 ? Math.min(10, Math.round((weekKcal / plans.length / 2000) * 10)) : 0;
  const proteinScore = plans.length > 0 ? Math.min(10, Math.round((weekProtein / plans.length / 50) * 10)) : 0;

  const cuisines = new Set(plans.map(p => p.recipe.cuisine).filter(Boolean));
  const diversityScore = Math.min(10, Math.round(cuisines.size * (period === 'day' ? 5 : period === 'week' ? 2.5 : 1.5)));

  const allIngNames = plans.flatMap(p => p.recipe.ingredients.map(i => i.ingredient.name));
  const seasonalCount = countSeasonalIngredients(allIngNames);
  const seasonalScore = Math.min(10, Math.round(seasonalCount * (period === 'day' ? 3 : 1.5)));

  const avgPrepTime = plans.length > 0
    ? plans.reduce((s, p) => s + ((p.recipe as any).prepTime || 30), 0) / plans.length : 0;
  const rapidityScore = avgPrepTime > 0 ? Math.min(10, Math.round((60 - Math.min(avgPrepTime, 60)) / 6)) : 5;

  const weekCost = plans.reduce((s, p) => {
    const c = estimateRecipeCost(
      p.recipe.ingredients.map(i => ({ name: i.ingredient.name, emoji: '', quantity: i.quantity, unit: i.unit })),
      p.recipe.servings || 4,
    );
    return s + c.perServing;
  }, 0);
  const budgetScore = Math.min(10, Math.round((1 - Math.min(weekCost / (200 / 4), 1)) * 10));
  const antiGaspiScore = Math.min(10, Math.round(fridgeUsePercent / 10));
  const regularityScore = Math.round((daysPlanned / Math.min(daysInPeriod, 7)) * 10);

  return NextResponse.json({
    radarScores: {
      calories: calorieScore,
      proteines: proteinScore,
      diversite: diversityScore,
      antiGaspi: antiGaspiScore,
      saisonnalite: seasonalScore,
      rapidite: rapidityScore,
      budget: budgetScore,
      regularite: Math.min(10, regularityScore),
    },
  });
}
