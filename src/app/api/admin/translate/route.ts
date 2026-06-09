import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { translateRecipe, translateToFrench } from '@/lib/ollama';

/**
 * POST /api/admin/translate
 * Batch-translate English recipes in DB to French via Ollama.
 * Admin only. Detects English by checking externalSrc (mealdb/spoonacular).
 */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    // Find recipes imported from external sources (likely English)
    const recipes = await prisma.recipe.findMany({
      where: {
        externalSrc: { in: ['mealdb', 'spoonacular'] },
      },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });

    let translated = 0;
    let failed = 0;

    for (const recipe of recipes) {
      // Simple heuristic: if name contains common English words, translate it
      const looksEnglish = /\b(the|with|and|chicken|beef|pork|fish|sauce|roasted|baked|fried|cream|stew|soup|pie|cake|salad|grilled)\b/i.test(recipe.name + ' ' + recipe.instructions);
      if (!looksEnglish) continue;

      try {
        const tr = await translateRecipe({
          name: recipe.name,
          description: recipe.description,
          instructions: recipe.instructions,
        });

        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            name: tr.name,
            description: tr.description,
            instructions: tr.instructions,
          },
        });

        // Translate ingredient names too
        for (const ri of recipe.ingredients) {
          const looksEnglishIng = /^[a-zA-Z\s]+$/.test(ri.ingredient.name);
          if (looksEnglishIng) {
            const frName = await translateToFrench(ri.ingredient.name, 'ingredient').catch(() => null);
            if (frName && frName !== ri.ingredient.name) {
              // Check no duplicate
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
        }

        translated++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ translated, failed, total: recipes.length });
  } catch (err: any) {
    console.error('Translate error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur traduction' }, { status: 500 });
  }
}
