import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// POST /api/admin/ingredients/merge  { sourceId, targetName }
// Corrige un ingrédient mal nommé :
//   - si aucun autre ingrédient ne porte le nom cible → simple RENOMMAGE.
//   - sinon → FUSION dans l'ingrédient cible existant (on rebranche recettes,
//     frigos et listes de courses, puis on supprime l'ingrédient source).
// Tout se fait dans une transaction (tout ou rien). Irréversible.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { sourceId, targetName } = await req.json();
  const clean = (targetName || '').trim();
  if (!sourceId || !clean) {
    return NextResponse.json({ error: 'sourceId et targetName requis' }, { status: 400 });
  }

  const source = await prisma.ingredient.findUnique({ where: { id: sourceId } });
  if (!source) return NextResponse.json({ error: 'Ingrédient introuvable' }, { status: 404 });

  // Cible déjà existante ? (comparaison insensible à la casse)
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: clean, mode: 'insensitive' } },
  });

  // ---- CAS 1 : renommage simple ----
  if (!existing || existing.id === source.id) {
    const updated = await prisma.ingredient.update({
      where: { id: source.id }, data: { name: clean },
    });
    return NextResponse.json({ action: 'renamed', name: updated.name, recipes: 0 });
  }

  // ---- CAS 2 : fusion dans l'ingrédient cible existant ----
  const targetId = existing.id;
  let movedRecipes = 0;

  await prisma.$transaction(async (tx) => {
    // RecipeIngredient — contrainte unique [recipeId, ingredientId]
    const ris = await tx.recipeIngredient.findMany({ where: { ingredientId: source.id } });
    for (const ri of ris) {
      const clash = await tx.recipeIngredient.findUnique({
        where: { recipeId_ingredientId: { recipeId: ri.recipeId, ingredientId: targetId } },
      });
      if (clash) {
        await tx.recipeIngredient.delete({ where: { id: ri.id } });
      } else {
        await tx.recipeIngredient.update({ where: { id: ri.id }, data: { ingredientId: targetId } });
        movedRecipes++;
      }
    }

    // FridgeItem — contrainte unique [userId, ingredientId]
    const fis = await tx.fridgeItem.findMany({ where: { ingredientId: source.id } });
    for (const fi of fis) {
      const clash = await tx.fridgeItem.findUnique({
        where: { userId_ingredientId: { userId: fi.userId, ingredientId: targetId } },
      });
      if (clash) await tx.fridgeItem.delete({ where: { id: fi.id } });
      else await tx.fridgeItem.update({ where: { id: fi.id }, data: { ingredientId: targetId } });
    }

    // ShoppingItem — pas de contrainte unique → repointage direct
    await tx.shoppingItem.updateMany({
      where: { ingredientId: source.id }, data: { ingredientId: targetId },
    });

    // Supprime l'ingrédient source, désormais orphelin
    await tx.ingredient.delete({ where: { id: source.id } });
  });

  return NextResponse.json({ action: 'merged', into: existing.name, recipes: movedRecipes });
}
