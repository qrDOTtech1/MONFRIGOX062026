import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { ingredientNameIssue, suggestIngredientName } from '@/lib/recipe-audit';

// GET /api/admin/ingredients/audit
// Liste les ingrédients mal nommés, avec leur volume d'usage et une suggestion
// de correction. Détecte si la cible proposée existe déjà (→ fusion) ou non
// (→ simple renommage). Lecture seule.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const ingredients = await prisma.ingredient.findMany({
    select: {
      id: true, name: true,
      _count: { select: { recipeIngredients: true, fridgeItems: true, shoppingItems: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Index nom (minuscule) → ingrédient, pour repérer si une cible existe déjà.
  const byName = new Map(ingredients.map(i => [i.name.toLowerCase(), { id: i.id, name: i.name }]));

  const flagged = ingredients
    .map(i => {
      const issue = ingredientNameIssue(i.name);
      if (!issue) return null;
      const suggestion = suggestIngredientName(i.name);
      let mergesInto: string | null = null;
      if (suggestion) {
        const t = byName.get(suggestion.toLowerCase());
        if (t && t.id !== i.id) mergesInto = t.name;
      }
      return {
        id: i.id,
        name: i.name,
        issue,
        suggestion,
        mergesInto, // nom de l'ingrédient cible existant, ou null (= renommage)
        recipeCount: i._count.recipeIngredients,
        fridgeCount: i._count.fridgeItems,
        shoppingCount: i._count.shoppingItems,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.recipeCount - a.recipeCount);

  return NextResponse.json({
    total: flagged.length,
    recettesTouchees: flagged.reduce((s, f) => s + f.recipeCount, 0),
    ingredients: flagged,
  });
}
