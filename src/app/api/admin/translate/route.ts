import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { translateRecipe, translateToFrench, translateRecipeToEnglish, translateToEnglish, convertToMetric, estimateNutrition } from '@/lib/ollama';

/**
 * POST /api/admin/translate
 * Batch-translate + enrich recipes in DB.
 * Admin only.
 *
 * body.action:
 *   "translate" — translate English recipes to French
 *   "nutrition" — estimate nutrition for recipes missing it
 *   "all"       — both (default)
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  let action = 'all';
  try {
    const body = await req.json();
    action = body.action || 'all';
  } catch { /* default to all */ }

  let translated = 0;
  let nutritionAdded = 0;
  let failed = 0;
  let total = 0;

  try {
    // ===== TRANSLATE =====
    if (action === 'translate' || action === 'all') {
      const recipes = await prisma.recipe.findMany({
        where: { externalSrc: { in: ['mealdb', 'spoonacular'] } },
        include: { ingredients: { include: { ingredient: true } } },
      });
      total = recipes.length;

      for (const recipe of recipes) {
        // Detect if text looks non-French (contains common EN words or purely ASCII latin)
        const text = recipe.name + ' ' + recipe.instructions;
        const hasEnglish = /\b(the|with|and|or|in|on|for|to|of|a|an|is|are|was|it|this|that|add|mix|stir|cook|bake|fry|boil|heat|place|put|until|remove|serve|let|make|cut|chop|slice|pour|drain|set|cover|season|preheat|whisk|combine|minutes|chicken|beef|pork|lamb|fish|sauce|cream|butter|flour|sugar|salt|pepper|onion|garlic|oil|water|milk|egg|cheese|tomato|potato|rice|bread)\b/i.test(text);

        if (!hasEnglish) continue;

        try {
          const tr = await translateRecipe({
            name: recipe.name,
            description: recipe.description,
            instructions: recipe.instructions,
          });

          await prisma.recipe.update({
            where: { id: recipe.id },
            data: { name: tr.name, description: tr.description, instructions: tr.instructions },
          });

          // Translate ingredient names + convert units
          for (const ri of recipe.ingredients) {
            const isEnglish = /^[a-zA-Z\s\-']+$/.test(ri.ingredient.name);
            if (isEnglish) {
              const frName = await translateToFrench(ri.ingredient.name, 'ingredient').catch(() => null);
              if (frName && frName !== ri.ingredient.name) {
                const existing = await prisma.ingredient.findFirst({
                  where: { name: { equals: frName, mode: 'insensitive' } },
                });
                if (!existing) {
                  await prisma.ingredient.update({
                    where: { id: ri.ingredient.id },
                    data: { name: frName },
                  });
                }
              }
            }
            // Convert EN units to FR
            const metric = convertToMetric(ri.quantity, ri.unit);
            if (metric.unit !== ri.unit || metric.quantity !== ri.quantity) {
              await prisma.recipeIngredient.update({
                where: { id: ri.id },
                data: { quantity: metric.quantity, unit: metric.unit },
              });
            }
          }

          translated++;
        } catch {
          failed++;
        }
      }
    }

    // ===== NUTRITION =====
    if (action === 'nutrition' || action === 'all') {
      const recipes = await prisma.recipe.findMany({
        where: { calories: null },
        include: { ingredients: { include: { ingredient: true } } },
      });
      if (action !== 'all') total = recipes.length;

      for (const recipe of recipes) {
        try {
          const ings = recipe.ingredients.map(ri => ({
            name: ri.ingredient.name,
            quantity: ri.quantity,
            unit: ri.unit,
          }));

          const nutrition = await estimateNutrition(recipe.name, ings, recipe.servings);

          await prisma.recipe.update({
            where: { id: recipe.id },
            data: {
              calories: nutrition.calories,
              protein: nutrition.protein,
              fat: nutrition.fat,
              carbs: nutrition.carbs,
              fiber: nutrition.fiber,
              salt: nutrition.salt,
              nutriScore: nutrition.nutriScore,
              kidFriendly: nutrition.kidFriendly,
              babyFriendly: nutrition.babyFriendly,
            },
          });
          nutritionAdded++;
        } catch {
          failed++;
        }
      }
    }

    // ===== TRANSLATE FR → EN =====
    if (action === 'translate-en') {
      // Recettes sans traduction anglaise
      const recipes = await prisma.recipe.findMany({
        where: { nameEn: '' },
        include: { ingredients: { include: { ingredient: true } } },
      });
      total = recipes.length;

      for (const recipe of recipes) {
        try {
          const en = await translateRecipeToEnglish({
            name: recipe.name,
            description: recipe.description,
            instructions: recipe.instructions,
          });

          await prisma.recipe.update({
            where: { id: recipe.id },
            data: { nameEn: en.nameEn, descriptionEn: en.descriptionEn, instructionsEn: en.instructionsEn },
          });

          // Traduire les noms d'ingrédients FR→EN si nameEn vide
          for (const ri of recipe.ingredients) {
            if (!ri.ingredient.nameEn) {
              const nameEn = await translateToEnglish(ri.ingredient.name, 'ingredient').catch(() => '');
              if (nameEn && nameEn !== ri.ingredient.name) {
                await prisma.ingredient.update({
                  where: { id: ri.ingredient.id },
                  data: { nameEn },
                }).catch(() => {});
              }
            }
          }

          translated++;
        } catch {
          failed++;
        }
      }
      return NextResponse.json({ translated, nutritionAdded: 0, failed, total });
    }

    return NextResponse.json({ translated, nutritionAdded, failed, total });
  } catch (err: any) {
    console.error('Translate/enrich error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur' }, { status: 500 });
  }
}
