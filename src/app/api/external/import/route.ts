import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import {
  mealdb_searchByName,
  mealdb_byArea,
  mealdb_areas,
  spoonacular_search,
  spoonacular_random,
  type MealDBRecipe,
  type SpoonacularRecipe,
} from '@/lib/food-apis';
import { translateRecipe, translateToFrench } from '@/lib/ollama';

/**
 * POST /api/external/import
 * Import recipes from TheMealDB or Spoonacular into our Prisma DB.
 * Admin only.
 *
 * Body:
 *   source: "mealdb" | "spoonacular"
 *   action: "search" | "all-areas" | "random"
 *   query?: string
 *   area?: string
 *   count?: number
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json();
  const { source, action, query, area, count } = body;
  let imported = 0;
  let skipped = 0;

  try {
    if (source === 'mealdb') {
      let meals: MealDBRecipe[] = [];

      if (action === 'all-areas') {
        const areas = await mealdb_areas();
        for (const a of areas) {
          const res = await mealdb_searchByName(a);
          meals.push(...res);
        }
      } else if (action === 'search' && query) {
        meals = await mealdb_searchByName(query);
      } else if (area) {
        const { mealdb_byArea } = await import('@/lib/food-apis');
        meals = await mealdb_byArea(area);
      }

      for (const meal of meals) {
        const existing = await prisma.recipe.findFirst({
          where: { OR: [{ externalId: meal.id, externalSrc: 'mealdb' }, { name: meal.name }] },
        });
        if (existing) { skipped++; continue; }

        // Traduire en français via Ollama
        let trName = meal.name;
        let trDesc = meal.instructions.slice(0, 150) + '...';
        let trInstructions = meal.instructions;
        try {
          const tr = await translateRecipe({ name: meal.name, description: trDesc, instructions: meal.instructions });
          trName = tr.name;
          trDesc = tr.description;
          trInstructions = tr.instructions;
        } catch { /* garde l'original si traduction échoue */ }

        const recipe = await prisma.recipe.create({
          data: {
            name: trName,
            description: trDesc,
            instructions: trInstructions,
            difficulty: 'FACILE',
            prepTime: 30,
            cuisine: meal.area || 'International',
            imageUrl: meal.thumbnail || '',
            servings: 4,
            externalId: meal.id,
            externalSrc: 'mealdb',
          },
        });

        // Lier les ingrédients — créer s'ils n'existent pas (traduits en FR)
        for (const ing of meal.ingredients) {
          const ingNameFr = await translateToFrench(ing.name, 'ingredient').catch(() => ing.name);
          let ingredient = await prisma.ingredient.findFirst({
            where: { OR: [{ name: { equals: ingNameFr, mode: 'insensitive' } }, { name: { equals: ing.name, mode: 'insensitive' } }] },
          });
          if (!ingredient) {
            ingredient = await prisma.ingredient.create({
              data: { name: ingNameFr, category: 'Importé', emoji: '🥘' },
            });
          }
          // Parse quantity from measure
          let quantity = 1;
          let unit = ing.measure || 'unité';
          const numMatch = ing.measure.match(/([\d.]+)/);
          if (numMatch) {
            quantity = parseFloat(numMatch[1]);
            unit = ing.measure.replace(numMatch[0], '').trim() || 'unité';
          }
          await prisma.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              ingredientId: ingredient.id,
              quantity,
              unit,
            },
          }).catch(() => {}); // ignore duplicate
        }
        imported++;
      }
    }

    if (source === 'spoonacular') {
      let spoonRecipes: SpoonacularRecipe[] = [];

      if (action === 'search' && query) {
        spoonRecipes = await spoonacular_search(query, undefined, count || 10);
      } else if (action === 'random') {
        spoonRecipes = await spoonacular_random(count || 10);
      }

      for (const sr of spoonRecipes) {
        if (!sr.instructions) { skipped++; continue; }
        const existing = await prisma.recipe.findFirst({
          where: { OR: [{ externalId: String(sr.id), externalSrc: 'spoonacular' }, { name: sr.title }] },
        });
        if (existing) { skipped++; continue; }

        const diff = sr.readyInMinutes <= 20 ? 'FACILE' : sr.readyInMinutes <= 45 ? 'MOYEN' : 'DIFFICILE';

        // Traduire en français via Ollama
        let trName = sr.title;
        let trDesc = sr.title;
        let trInstructions = sr.instructions;
        try {
          const tr = await translateRecipe({ name: sr.title, description: sr.title, instructions: sr.instructions });
          trName = tr.name;
          trDesc = tr.description;
          trInstructions = tr.instructions;
        } catch { /* garde l'original si traduction échoue */ }

        const recipe = await prisma.recipe.create({
          data: {
            name: trName,
            description: trDesc,
            instructions: trInstructions,
            difficulty: diff as any,
            prepTime: sr.readyInMinutes || 30,
            cuisine: sr.cuisines?.[0] || 'International',
            imageUrl: sr.image || '',
            servings: sr.servings || 4,
            externalId: String(sr.id),
            externalSrc: 'spoonacular',
          },
        });

        for (const ing of sr.ingredients) {
          const ingNameFr = await translateToFrench(ing.name, 'ingredient').catch(() => ing.name);
          let ingredient = await prisma.ingredient.findFirst({
            where: { OR: [{ name: { equals: ingNameFr, mode: 'insensitive' } }, { name: { contains: ing.name, mode: 'insensitive' } }] },
          });
          if (!ingredient) {
            ingredient = await prisma.ingredient.create({
              data: { name: ingNameFr, category: 'Importé', emoji: '🥘' },
            });
          }
          await prisma.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              ingredientId: ingredient.id,
              quantity: ing.amount || 1,
              unit: ing.unit || 'unité',
            },
          }).catch(() => {});
        }
        imported++;
      }
    }

    return NextResponse.json({ imported, skipped, total: imported + skipped });
  } catch (err: any) {
    console.error('Import error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur import' }, { status: 500 });
  }
}
