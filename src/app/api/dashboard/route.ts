import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { estimateRecipeCost } from '@/lib/recipe-cost';
import { countSeasonalIngredients } from '@/lib/seasonal';

function dateKey(d: Date) { return d.toISOString().split('T')[0]; }

function toGrams(qty: number, unit: string): number {
  const u = (unit || '').toLowerCase().trim();
  if (['g', 'gr', 'gramme', 'grammes'].includes(u)) return qty;
  if (u === 'kg') return qty * 1000;
  if (['ml', 'millilitre'].includes(u)) return qty;
  if (['l', 'litre'].includes(u)) return qty * 1000;
  if (u === 'cs') return qty * 15;
  if (u === 'cc') return qty * 5;
  if (u.includes('tranche')) return qty * 30;
  return qty * 100;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const now = new Date();
  const todayKey = dateKey(now);
  const weekStart = new Date(now);
  const dow = now.getDay() === 0 ? -6 : 1 - now.getDay();
  weekStart.setDate(now.getDate() + dow);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── User info ──
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, plan: true, planExpiresAt: true, role: true, tasteProfile: true },
  });
  const effectivePlan = (userRecord?.planExpiresAt && userRecord.planExpiresAt < now)
    ? 'FREE' : (userRecord?.plan || 'FREE');
  let tasteProfile: { goals?: string[] } = {};
  try { tasteProfile = JSON.parse(userRecord?.tasteProfile || '{}'); } catch {}

  // ── Today's meal plan ──
  const todayPlans = await prisma.mealPlan.findMany({
    where: {
      userId: user.id,
      date: { gte: new Date(todayKey + 'T00:00:00Z'), lte: new Date(todayKey + 'T23:59:59Z') },
    },
    include: {
      recipe: {
        select: { id: true, name: true, prepTime: true, imageUrl: true, calories: true, protein: true,
          ingredients: { include: { ingredient: { select: { emoji: true, name: true } } } } },
      },
    },
    orderBy: { mealType: 'asc' },
  });

  // ── Week meal plans ──
  const weekPlans = await prisma.mealPlan.findMany({
    where: { userId: user.id, date: { gte: weekStart, lte: weekEnd } },
    include: {
      recipe: {
        select: { calories: true, protein: true, servings: true, cuisine: true,
          ingredients: { select: { quantity: true, unit: true, ingredient: { select: { name: true } } } } },
      },
    },
  });

  // ── Fridge ──
  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: { select: { name: true, emoji: true } } },
  });
  const expiringItems = fridgeItems.filter(f => {
    if (!f.expiresAt) return false;
    const diff = (new Date(f.expiresAt).getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 3;
  });
  const totalFridge = fridgeItems.length;
  const usedThisWeekIds = new Set(
    weekPlans.flatMap(p => p.recipe.ingredients.map(i => i.ingredient.name.toLowerCase()))
  );
  const fridgeUsed = fridgeItems.filter(f => usedThisWeekIds.has(f.ingredient.name.toLowerCase())).length;
  const fridgeUsePercent = totalFridge > 0 ? Math.round((fridgeUsed / totalFridge) * 100) : 0;

  // ── Cook logs (last 30 days) ──
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const cookLogs = await prisma.cookLog.findMany({
    where: { userId: user.id, cookedAt: { gte: thirtyDaysAgo } },
    include: {
      recipe: {
        select: { cuisine: true, calories: true, servings: true,
          ingredients: { select: { quantity: true, unit: true, ingredient: { select: { name: true, emoji: true } } } } },
      },
    },
    orderBy: { cookedAt: 'desc' },
  });
  const logsThisMonth = cookLogs.filter(l => l.cookedAt >= monthStart);

  // ── Streak: consecutive days with at least 1 plan ──
  const allPlans = await prisma.mealPlan.findMany({
    where: { userId: user.id },
    select: { date: true },
    orderBy: { date: 'desc' },
  });
  const plannedDays = new Set(allPlans.map(p => dateKey(new Date(p.date))));
  let streak = 0;
  const check = new Date(now);
  while (plannedDays.has(dateKey(check))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // ── Week stats for radar ──
  const daysPlanned = new Set(weekPlans.map(p => dateKey(new Date(p.date)))).size;
  const regularityScore = Math.round((daysPlanned / 7) * 10);

  const weekKcal = weekPlans.reduce((s, p) => s + (p.recipe.calories || 0), 0);
  const weekProtein = weekPlans.reduce((s, p) => s + (p.recipe.protein || 0), 0);
  const calorieGoal = 2000;
  const proteinGoal = 50;
  const calorieScore = weekPlans.length > 0
    ? Math.min(10, Math.round((weekKcal / weekPlans.length / calorieGoal) * 10)) : 0;
  const proteinScore = weekPlans.length > 0
    ? Math.min(10, Math.round((weekProtein / weekPlans.length / proteinGoal) * 10)) : 0;

  const cuisines = new Set(weekPlans.map(p => p.recipe.cuisine).filter(Boolean));
  const diversityScore = Math.min(10, Math.round(cuisines.size * 2.5));

  const allIngNames = weekPlans.flatMap(p => p.recipe.ingredients.map(i => i.ingredient.name));
  const seasonalCount = countSeasonalIngredients(allIngNames);
  const seasonalScore = Math.min(10, Math.round(seasonalCount * 1.5));

  const avgPrepTime = weekPlans.length > 0
    ? weekPlans.reduce((s, p) => s + (p.recipe as any).prepTime || 30, 0) / weekPlans.length : 0;
  const rapidityScore = avgPrepTime > 0 ? Math.min(10, Math.round((60 - Math.min(avgPrepTime, 60)) / 6)) : 5;

  const weekCost = weekPlans.reduce((s, p) => {
    const c = estimateRecipeCost(
      p.recipe.ingredients.map(i => ({ name: i.ingredient.name, emoji: '', quantity: i.quantity, unit: i.unit })),
      p.recipe.servings || 4,
    );
    return s + c.perServing;
  }, 0);
  const budgetGoal = 200;
  const budgetScore = Math.min(10, Math.round((1 - Math.min(weekCost / (budgetGoal / 4), 1)) * 10));
  const antiGaspiScore = Math.min(10, Math.round(fridgeUsePercent / 10));

  const radarScores = {
    calories: calorieScore,
    proteines: proteinScore,
    diversite: diversityScore,
    antiGaspi: antiGaspiScore,
    saisonnalite: seasonalScore,
    rapidite: rapidityScore,
    budget: budgetScore,
    regularite: regularityScore,
  };

  // ── Week summary stats ──
  const kcalPerDay = weekPlans.length > 0 && daysPlanned > 0
    ? Math.round(weekKcal / daysPlanned) : 0;
  const kgSaved = logsThisMonth.reduce((s, l) => {
    const grams = l.recipe.ingredients.reduce((g, i) => g + toGrams(i.quantity, i.unit), 0);
    return s + grams * 0.2 / 1000;
  }, 0);
  const spent = weekCost;
  const recipesCooked = logsThisMonth.length;

  // ── Badges ──
  const badges = [];
  if (streak >= 7) badges.push({ id: 'streak7', label: '🔥 7 jours planifiés', desc: 'Streak de 7 jours consécutifs' });
  if (streak >= 30) badges.push({ id: 'streak30', label: '🏆 Mois parfait', desc: '30 jours consécutifs !' });
  if (fridgeUsePercent >= 80) badges.push({ id: 'nogaspi', label: '💚 Zéro gaspi', desc: '80%+ du frigo utilisé cette semaine' });
  if (cuisines.size >= 4) badges.push({ id: 'world', label: '🌍 Tour du monde', desc: '4+ cuisines différentes cette semaine' });
  if (weekPlans.every(p => {
    const names = p.recipe.ingredients.map(i => i.ingredient.name.toLowerCase());
    return !names.some(n => ['bœuf','poulet','porc','veau','agneau','saumon','thon'].some(m => n.includes(m)));
  }) && weekPlans.length >= 3) badges.push({ id: 'vege', label: '🥦 Chef végé', desc: 'Semaine sans viande ni poisson' });
  if (budgetScore >= 8) badges.push({ id: 'budget', label: '💶 Bonne semaine budget', desc: 'Dans les clous du budget' });

  // ── Mascot state ──
  let mascotVariant: string;
  let mascotMessage: string;
  const hour = now.getHours();
  if (expiringItems.length >= 3) { mascotVariant = 'worried'; mascotMessage = `${expiringItems.length} ingrédients périment bientôt !`; }
  else if (streak >= 7)         { mascotVariant = 'excited'; mascotMessage = `${streak} jours de streak 🔥`; }
  else if (daysPlanned === 7)   { mascotVariant = 'excited'; mascotMessage = 'Semaine 100% planifiée ! 🎉'; }
  else if (totalFridge === 0)   { mascotVariant = 'sad';     mascotMessage = 'Ton frigo est vide 😢'; }
  else if (hour >= 22 || hour < 6) { mascotVariant = 'sleep'; mascotMessage = 'Bonne nuit ! 😴'; }
  else if (daysPlanned === 0)   { mascotVariant = 'sad';     mascotMessage = 'Rien de planifié cette semaine…'; }
  else                          { mascotVariant = 'happy';   mascotMessage = `Bonjour ${userRecord?.name?.split(' ')[0] || ''} !`; }

  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return NextResponse.json({
    user: { name: userRecord?.name || '', plan: effectivePlan, role: userRecord?.role },
    greeting,
    mascotVariant,
    mascotMessage,
    todayPlans,
    streak,
    expiringCount: expiringItems.length,
    expiringItems: expiringItems.slice(0, 3).map(f => ({ name: f.ingredient.name, emoji: f.ingredient.emoji, expiresAt: f.expiresAt })),
    radarScores,
    weekStats: { kcalPerDay, kgSaved: +kgSaved.toFixed(1), spent: +spent.toFixed(0), recipesCooked, daysPlanned },
    badges,
  });
}
