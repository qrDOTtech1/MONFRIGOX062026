import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { auditRecipe } from '@/lib/recipe-audit';

// GET /api/admin/recipes/audit
// Scanne TOUTES les recettes et renvoie, pour chacune, un score qualité + ses
// défauts détectés. Lecture seule : ne modifie jamais la base.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true, name: true, description: true, instructions: true,
      difficulty: true, prepTime: true, cuisine: true, servings: true,
      externalSrc: true, authorId: true, isRevisite: true,
      ingredients: {
        select: { quantity: true, unit: true, ingredient: { select: { name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const audited = recipes.map(r => {
    const result = auditRecipe({
      name: r.name,
      description: r.description,
      instructions: r.instructions,
      cuisine: r.cuisine,
      prepTime: r.prepTime,
      servings: r.servings,
      difficulty: r.difficulty,
      externalSrc: r.externalSrc,
      authorId: r.authorId,
      isRevisite: r.isRevisite,
      ingredients: r.ingredients.map(ri => ({
        name: ri.ingredient.name, quantity: ri.quantity, unit: ri.unit,
      })),
    });
    return {
      id: r.id, name: r.name, source: result.source,
      score: result.score, flags: result.flags,
    };
  });

  // Recettes les plus défectueuses en premier.
  audited.sort((a, b) => a.score - b.score);

  const summary = {
    total: audited.length,
    parfaites: audited.filter(r => r.flags.length === 0).length,
    aCorriger: audited.filter(r => r.score < 70).length,
    parSource: audited.reduce<Record<string, number>>((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1; return acc;
    }, {}),
    flagsFrequents: Object.entries(
      audited.flatMap(r => r.flags).reduce<Record<string, number>>((acc, f) => {
        acc[f.label] = (acc[f.label] || 0) + 1; return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]).slice(0, 12),
  };

  return NextResponse.json({ summary, recipes: audited });
}
