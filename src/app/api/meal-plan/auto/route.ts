import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';
import { checkAndConsumeAI } from '@/lib/ai-rate-limit';

// POST /api/meal-plan/auto — generate a balanced week of meals (VIP only)
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, planExpiresAt: true, role: true, tasteProfile: true, defaultServings: true, dietMode: true, allergens: true },
  });

  const isVIP = profile?.role === 'ADMIN' || (profile?.plan === 'VIP' && (!profile.planExpiresAt || profile.planExpiresAt > new Date()));
  if (!isVIP) {
    return NextResponse.json({ error: 'Planning auto réservé aux abonnés VIP.', upgrade: true }, { status: 403 });
  }

  const rl = await checkAndConsumeAI(user.id);
  if (!rl.allowed) return NextResponse.json({ error: rl.reason }, { status: 429 });

  // Get available recipes
  const recipes = await prisma.recipe.findMany({
    select: { id: true, name: true, calories: true, protein: true, carbs: true, fat: true, cuisine: true, prepTime: true, difficulty: true, kidFriendly: true },
    take: 200,
  });

  // Get fridge items for context
  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: true },
  });

  let taste: Record<string, unknown> = {};
  try { taste = JSON.parse(profile?.tasteProfile || '{}'); } catch {}

  const recipeList = recipes.map(r => `${r.id}|${r.name}|${r.calories ?? '?'}kcal|${r.cuisine}|${r.prepTime}min`).join('\n');

  const resp = await chatCompletion([
    {
      role: 'system',
      content: `Tu es un diététicien expert. Génère un planning de repas équilibré pour 7 jours (lundi à dimanche).
Chaque jour a 3 repas : BREAKFAST, LUNCH, DINNER.

Règles :
- Varie les cuisines et types de plats
- Équilibre nutritionnel : ~2000 kcal/jour, protéines/glucides/lipides variés
- Ne répète pas la même recette dans la semaine sauf petit-déjeuner
- Tiens compte du régime : ${profile?.dietMode || 'aucun'}
- Allergènes exclus : ${profile?.allergens || 'aucun'}
- Préférences goût : ${JSON.stringify(taste)}

Réponds UNIQUEMENT en JSON : [{"day":0,"meal":"BREAKFAST","recipeId":"cuid"},...] (day 0=lundi, 6=dimanche).
Utilise UNIQUEMENT les IDs de la liste fournie.`,
    },
    {
      role: 'user',
      content: `Recettes disponibles :\n${recipeList}\n\nIngrédients frigo : ${fridgeItems.map(f => f.ingredient.name).join(', ')}\n\nGénère le planning de la semaine.`,
    },
  ], { temperature: 0.6 });

  const raw = resp.message?.content?.trim() || '';
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    const plan: Array<{ day: number; meal: string; recipeId: string }> = match ? JSON.parse(match[0]) : [];

    // Get next Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((8 - dayOfWeek) % 7 || 7));

    const validMeals = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const recipeIds = new Set(recipes.map(r => r.id));
    const saved = [];

    for (const entry of plan) {
      if (entry.day < 0 || entry.day > 6) continue;
      if (!validMeals.includes(entry.meal)) continue;
      if (!recipeIds.has(entry.recipeId)) continue;

      const date = new Date(nextMonday);
      date.setDate(nextMonday.getDate() + entry.day);
      const dateStr = date.toISOString().slice(0, 10);

      const mp = await prisma.mealPlan.upsert({
        where: { userId_date_mealType: { userId: user.id, date: new Date(dateStr + 'T00:00:00.000Z'), mealType: entry.meal as 'BREAKFAST' | 'LUNCH' | 'DINNER' } },
        create: { userId: user.id, recipeId: entry.recipeId, date: new Date(dateStr + 'T00:00:00.000Z'), mealType: entry.meal as 'BREAKFAST' | 'LUNCH' | 'DINNER' },
        update: { recipeId: entry.recipeId },
      });
      saved.push(mp);
    }

    return NextResponse.json({
      saved: saved.length,
      weekStart: nextMonday.toISOString().slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la génération du planning' }, { status: 500 });
  }
}
