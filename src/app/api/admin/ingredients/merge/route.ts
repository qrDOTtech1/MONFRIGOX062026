import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

// POST /api/admin/ingredients/merge  { sourceId, targetName }
// Corrige un ingrédient mal nommé :
//   - si aucun autre ingrédient ne porte le nom cible → simple RENOMMAGE.
//   - sinon → FUSION dans l'ingrédient cible existant (on rebranche recettes,
//     frigos et listes de courses, puis on supprime l'ingrédient source).
// Requêtes GROUPÉES (pas de boucle) pour rester rapide même sur 60+ recettes,
// dans une transaction (tout ou rien) avec un délai large. Irréversible.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
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

    // Recettes/frigos qui possèdent DÉJÀ la cible → le lien source y ferait doublon.
    const [targetRIs, targetFIs, sourceRICount] = await Promise.all([
      prisma.recipeIngredient.findMany({ where: { ingredientId: targetId }, select: { recipeId: true } }),
      prisma.fridgeItem.findMany({ where: { ingredientId: targetId }, select: { userId: true } }),
      prisma.recipeIngredient.count({ where: { ingredientId: source.id } }),
    ]);
    const dupRecipeIds = targetRIs.map(r => r.recipeId);
    const dupUserIds = targetFIs.map(f => f.userId);

    await prisma.$transaction(async (tx) => {
      // RecipeIngredient : supprime les doublons, repointe le reste.
      if (dupRecipeIds.length) {
        await tx.recipeIngredient.deleteMany({
          where: { ingredientId: source.id, recipeId: { in: dupRecipeIds } },
        });
      }
      await tx.recipeIngredient.updateMany({
        where: { ingredientId: source.id }, data: { ingredientId: targetId },
      });

      // FridgeItem : idem.
      if (dupUserIds.length) {
        await tx.fridgeItem.deleteMany({
          where: { ingredientId: source.id, userId: { in: dupUserIds } },
        });
      }
      await tx.fridgeItem.updateMany({
        where: { ingredientId: source.id }, data: { ingredientId: targetId },
      });

      // ShoppingItem : pas de contrainte unique → repointage direct.
      await tx.shoppingItem.updateMany({
        where: { ingredientId: source.id }, data: { ingredientId: targetId },
      });

      // Supprime l'ingrédient source, désormais orphelin.
      await tx.ingredient.delete({ where: { id: source.id } });
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json({ action: 'merged', into: existing.name, recipes: sourceRICount });
  } catch (e) {
    console.error('[ingredients/merge] Erreur:', e);
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: `Fusion impossible : ${message}` }, { status: 500 });
  }
}
